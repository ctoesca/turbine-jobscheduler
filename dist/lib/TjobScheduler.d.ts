/// <reference types="bluebird" />
import * as turbine from "turbine";
import Promise = require("bluebird");
export declare class TjobScheduler extends turbine.services.TbaseService {
    schedules: {};
    refreshTimer: turbine.tools.Ttimer;
    constructor(name: any, config: any);
    getDefaultConfig(): {
        "active": boolean;
        "userAgent": string;
        "executionPolicy": string;
        "refreshInterval": number;
        "url": {
            "start_job": string;
            "get_cron_schedules": string;
            "check": string;
        };
        "api_username": string;
        "api_password": string;
        "api_key": any;
        "taskNameFunction": (schedule: any) => any;
        "workDir": string;
    };
    flatify(): Promise<{}>;
    private request(method, url);
    private getTaskName(schedule);
    private scheduleAllJobs();
    start(): void;
    stop(): void;
    private execBatch(scheduleItem);
    private onRefreshTimer();
    private scheduleJob(scheduleItem);
    private cancelAllJobs();
}
