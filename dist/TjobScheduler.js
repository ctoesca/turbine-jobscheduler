"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const turbine = require("../../../../turbine2/trunk/dist");
const Promise = require("bluebird");
const cron = require("cron");
const request = require("request");
class TjobScheduler extends turbine.services.TbaseService {
    constructor(name, config) {
        super(name, config);
        this.refreshTimer = new turbine.tools.Ttimer({ delay: this.config.refreshInterval * 1000 });
        this.refreshTimer.on(turbine.tools.Ttimer.ON_TIMER, this.onRefreshTimer, this);
    }
    getDefaultConfig() {
        return {
            "active": true,
            "userAgent": "turbine",
            "executionPolicy": "one_in_cluster",
            "refreshInterval": 60,
            "url": {
                "start_job": "http://localhost:82/apis/robotop/1.0/schedules/{scheduleId}/start",
                "get_schedules": "http://localhost:82/apis/robotop/1.0/schedules?where=active=1 AND type='cron'"
            },
            "api_username": "turbine-server",
            "api_password": "s3#cr3t",
            "api_key": null,
            "taskNameFunction": function (schedule) {
                return schedule.task_name;
            },
            "workDir": __dirname + "/tmp/TjobScheduler"
        };
    }
    flatify() {
        return new Promise(function (resolve, reject) {
            var r = {};
            resolve(r);
        }.bind(this));
    }
    getSchedules() {
        return new Promise(function (resolve, reject) {
            var url = this.config.url.get_schedules;
            var opt = {
                strictSSL: false,
                json: true,
                headers: {
                    'User-Agent': this.config.userAgent
                }
            };
            if (this.config.api_key) {
                url += "&ticket=" + this.config.api_key;
            }
            else if (this.config.api_username && this.config.api_password) {
                opt.auth =
                    {
                        user: this.config.api_username,
                        pass: this.config.api_password,
                        sendImmediately: true
                    };
            }
            request.get(url, opt, function (error, response, body) {
                if (error) {
                    reject("Http GET error=" + error + ", url=" + url);
                }
                else {
                    if (response && (response.statusCode < 400)) {
                        resolve(body.data);
                    }
                    else {
                        reject("Http POST status=" + response.statusCode + ", body=" + body + ", url=" + url);
                    }
                }
            }.bind(this));
        }.bind(this));
    }
    getTaskName(schedule) {
        return this.config.taskNameFunction(schedule);
    }
    scheduleAllJobs() {
        return this.getSchedules()
            .then(function (schedules) {
            if (typeof schedules == "undefined") {
                this.logger.error("schedules is undefined");
                return;
            }
            for (var k in this.schedules)
                this.schedules[k].valid = 0;
            for (var j = 0; j < schedules.length; j++) {
                var schedule = schedules[j];
                var scheduleItem = {
                    valid: 1,
                    schedule: schedule,
                    job: null
                };
                if (this.schedules[schedule.id]) {
                    if (this.schedules[schedule.id].schedule.data.cron != schedule.data.cron) {
                        this.logger.info("scheduleAllJobs", "TASK '" + this.getTaskName(schedule) + "' : re-planification car le cron a changé: " + schedule.data.cron);
                        this.schedules[schedule.id].job.stop();
                        this.scheduleJob(scheduleItem);
                    }
                    else {
                        this.schedules[schedule.id].schedule = schedule;
                        this.schedules[schedule.id].valid = 1;
                    }
                }
                else {
                    this.logger.info("scheduleAllJobs", "TASK '" + this.getTaskName(schedule) + "' : planification de cron " + schedule.data.cron);
                    this.scheduleJob(scheduleItem);
                }
            }
            for (var k in this.schedules) {
                if (this.schedules[k].valid == 0) {
                    this.logger.info("scheduleAllJobs", "TASK '" + this.getTaskName(this.schedules[k].schedule) + "' : dé-planification du cron " + this.schedules[k].schedule.data.cron);
                    this.schedules[k].job.stop();
                    delete this.schedules[k];
                }
            }
        }.bind(this), function (err) {
            this.logger.error("scheduleAllJobs", err);
        }.bind(this));
    }
    start() {
        if (this.active) {
            this.scheduleAllJobs();
            this.refreshTimer.start();
            super.start();
        }
    }
    stop() {
        this.refreshTimer.stop();
        this.cancelAllJobs();
        super.stop();
    }
    execBatch(scheduleItem) {
        if (!this.refreshTimer.running) {
            this.logger.error("annulé");
            this.cancelAllJobs();
            return;
        }
        var url = this.config.url.start_job.replace(/\{scheduleId\}/g, scheduleItem.schedule.id);
        var params = {};
        var opt = {
            strictSSL: false,
            json: true,
            headers: {
                'User-Agent': this.config.userAgent
            }
        };
        if (this.config.api_key) {
            url += "?ticket=" + this.config.api_key;
        }
        else if (this.config.api_username && this.config.api_password) {
            opt.auth =
                {
                    user: this.config.api_username,
                    pass: this.config.api_password,
                    sendImmediately: true
                };
        }
        request.post(url, opt, function (error, response, body) {
            var taskName = this.getTaskName(scheduleItem.schedule);
            if (error) {
                this.logger.error("EXECTASK '" + taskName + "': Http GET error=" + error + ", url=" + url);
            }
            else {
                if (response && (response.statusCode < 400)) {
                    this.logger.info("EXECTASK '" + taskName + "': STARTED");
                }
                else {
                    this.logger.error("EXECTASK '" + taskName + "': Http GET status=" + response.statusCode + ", body=" + body + ", url=" + url);
                }
            }
        }.bind(this));
    }
    onRefreshTimer() {
        this.scheduleAllJobs();
    }
    scheduleJob(scheduleItem) {
        try {
            scheduleItem.job = new cron.CronJob(scheduleItem.schedule.data.cron, this.execBatch.bind(this, scheduleItem), function () {
            }, true);
            this.schedules[scheduleItem.schedule.id] = scheduleItem;
        }
        catch (err) {
            this.logger.warn({ err: err }, "Failed to schedule task '" + this.getTaskName(scheduleItem.schedule) + "' " + scheduleItem.schedule.data.cron + " : " + err);
        }
        return scheduleItem.job;
    }
    cancelAllJobs() {
        for (var k in this.schedules) {
            try {
                this.schedules[k].job.stop();
                this.logger.info("cancel job " + k + ": OK");
            }
            catch (err) {
                this.logger.error("cancel job " + k + ": " + err.toString());
            }
        }
        this.schedules = {};
    }
}
exports.TjobScheduler = TjobScheduler;
//# sourceMappingURL=TjobScheduler.js.map