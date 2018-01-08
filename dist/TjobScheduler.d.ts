import * as turbine from "../../../../turbine2/trunk/dist";
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
            "get_schedules": string;
        };
        "api_username": string;
        "api_password": string;
        "api_key": any;
        "taskNameFunction": (schedule: any) => any;
        "workDir": string;
    };
    flatify(): any;
    getSchedules(): any;
    getTaskName(schedule: any): any;
    scheduleAllJobs(): any;
    start(): void;
    stop(): void;
    execBatch(scheduleItem: any): void;
    onRefreshTimer(): void;
    scheduleJob(scheduleItem: any): any;
    cancelAllJobs(): void;
}
