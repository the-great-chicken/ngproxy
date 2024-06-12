
import { readFileSync, writeFileSync, statSync, rmSync } from "fs";
import { AbstractMutex } from "./mutex";
import { Logger } from "../../logger";

export class FileMutex extends AbstractMutex {
    logger: Logger;
    path  : string;

    private currentAuth: string | undefined;

    private doesLockExistSync (): boolean {
        try {
            let stats = statSync(this.path, { throwIfNoEntry: true });

            return stats.isFile();
        } catch (error) {
            return false;
        }
    }
    private isLockDirectorySync (): boolean {
        try {
            let stats = statSync(this.path, { throwIfNoEntry: true });

            return stats.isDirectory();
        } catch (error) {
            return false;
        }
    }
    private getLockSync (): string | undefined {
        try {
            return readFileSync(this.path, "utf-8");
        } catch (error) {
            if (this.isLockDirectorySync())
                this.logger.error(`Could not read lock from file ${this.path} as it is a directory`);
            else if (this.doesLockExistSync())
                this.logger.error(`Could not read lock from file ${this.path} because ${error}`);

            return undefined;
        }
    }
    private setLockSync (auth: string): boolean {
        try {
            writeFileSync(this.path, auth, { encoding: "utf-8" });
            return true;
        } catch (error) {
            this.logger.error(`Could not write lock to file ${this.path}, because ${error}`);
            return false;
        }
    }
    private removeLockSync (): boolean {
        try {
            rmSync(this.path);
            return true;
        } catch (error) {
            if (this.doesLockExistSync()) this.logger.error(`Could not remove lock file ${this.path}: "${error}"`);
            return false;
        }
    }
    constructor (logger: Logger, path: string) {
        super();
        this.logger = logger;
        this.path   = path;

        this.currentAuth = this.getLockSync();

        if (this.currentAuth) this.lockAcquired = true;
    }

    protected acquireLock (auth: string): Promise<boolean> {
        return new Promise((resolve, _reject) => { 
            let res = this.setLockSync(auth);
            if (res)
                this.currentAuth = auth;
            resolve(res);
        });
    }
    protected freeLock (auth: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (this.currentAuth === undefined || this.currentAuth != auth) 
                return resolve(false);
            
            let res = this.removeLockSync();
            if (res)
                this.currentAuth = undefined;
            resolve(res);
        });
    }
    protected save (auth: string, hasLock: boolean) {}

}