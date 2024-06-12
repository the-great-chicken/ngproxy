
export interface Mutex {
    lock (auth: string): Promise<boolean>;
    free (auth: string): Promise<boolean>;
    
    isLockAcquired (): boolean;
};

export abstract class AbstractMutex implements Mutex {
    lockAcquired: boolean = false;

    isLockAcquired(): boolean {
        return this.lockAcquired;
    }
    lock(auth: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (this.isLockAcquired()) {
                resolve(false);
                return ;
            }

            this.acquireLock(auth)
                .then((value: boolean) => {
                    if (value) {
                        this.lockAcquired = true;
                        this.save(auth, value);
                    }
                    resolve(value);
                })
                .catch(reject)
        })
    }
    free(auth: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (!this.isLockAcquired()) {
                resolve(false);
                return ;
            }

            this.freeLock( auth )
                .then((value: boolean) => {
                    if (value) {
                        this.lockAcquired = false;
                        this.save(undefined, false);
                    }
                    resolve(value);
                })
                .catch(reject);
        })
    }

    protected abstract acquireLock (auth: string): Promise<boolean>;
    protected abstract freeLock    (auth: string): Promise<boolean>;

    protected abstract save (auth: string, hasLock: boolean);
};
