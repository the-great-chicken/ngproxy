
import { NGProxyConfig } from "../config";
import { NGProxyContext } from "../context";
import { Logger, LoggerFactory } from "../logger";
import { FileMutex } from "./mutex/file";
import { Mutex } from "./mutex/mutex";

const BASE64_CHARACTERS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz/-";

const DEFAULT_AUTH_TOKEN_SIZE = 20;

export function random_base64 (size: number): string {
    if (size < 0) throw "Expected the size for the string to be positive";

    let result: string[] = [];
    for (let i = 0; i < size; i ++) {
        let uuid = Math.floor(Math.random() * BASE64_CHARACTERS.length);

        result.push( BASE64_CHARACTERS[uuid] );
    }
    
    return result.join("");
}

export interface ProxyController {
    start (): Promise<boolean>;
    close (): Promise<boolean>;
};

export abstract class AbstractProxyController implements ProxyController {
    startedMutex:   Mutex;
    localFileMutex: FileMutex;

    logger  : Logger;
    context : NGProxyContext;

    constructor (context: NGProxyContext, startedMutex: Mutex, pathToStorage: string) {
        this.startedMutex = startedMutex;

        this.logger  = context.loggerFactory.build("ProxyController");
        this.context = context;

        this.localFileMutex = new FileMutex(
            context.loggerFactory.build("ProxyControllerStorage"), pathToStorage);

        if (this.localFileMutex.isLockAcquired() != this.startedMutex.isLockAcquired())
            this.logger.danger("The local file mutex responsible for storing the lock of the start mutex isn't synchronized with the potentially distant mutex");
        
        this.init();
        if (this.localFileMutex.isLockAcquired())
            this.run();
    }

    start(): Promise<boolean> {
        return (async () => {
            if (this.localFileMutex.isLockAcquired()) return false;

            let size = this.context.config.authTokenSize;
            if (size === undefined || size <= 0) {
                if (size <= 0) this.logger.danger(`ImproperConfigurationDanger, AuthTokenSize <= 0, falling back to default`)
                size = DEFAULT_AUTH_TOKEN_SIZE;
            }

            const token = random_base64( size );
            const res1 = await this.startedMutex.lock(token);
            if (!res1) return false;

            const res2 = await this.localFileMutex.lock(token);
            if (!res2) {
                if (!await this.startedMutex.free(token))
                    this.logger.error(`Could not free start mutex after exception, the proxy might need a restart due to a softlock.`);
                
                return false;
            }

            this.run();
            return true;
        })();
    }
    close(): Promise<boolean> {
        return (async () => {
            if (!this.localFileMutex.isLockAcquired()) return false;

            const token = this.localFileMutex.getCurrentAuthToken();

            const res1 = await this.localFileMutex.free(token);
            if (!res1) return false;

            const res2 = await this.startedMutex.free(token);
            if (!res2) {
                if (!(await this.localFileMutex.lock(token)))
                    this.logger.error(`Could not relock local file after unsync, the client might be soft locked.`);
                return false;
            }

            this.end();
            return true;
        })();
    }

    protected abstract init (): void;
    protected abstract run (): void;
    protected abstract end (): void;
};
