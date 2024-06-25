import { AbstractMutex } from "../../../ngproxy/controller/mutex/mutex";

export class TestMutex extends AbstractMutex {
    auth: string | undefined = undefined;

    protected acquireLock(_auth: string): Promise<boolean> {
        return (async () => true)();
    }
    protected freeLock(_auth: string): Promise<boolean> {
        return (async () => true)();
    }
    protected save(auth: string, _hasLock: boolean) {
        this.auth = auth;
    }
}
