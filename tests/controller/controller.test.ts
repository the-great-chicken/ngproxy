import { NGProxyConfig } from "../../ngproxy/config"
import { NGProxyContext } from "../../ngproxy/context"
import { AbstractProxyController, random_base64 } from "../../ngproxy/controller/controller";
import { FileMutex } from "../../ngproxy/controller/mutex/file";
import { Mutex } from "../../ngproxy/controller/mutex/mutex";
import { createMockConsole, returnToNormalConsole } from "../utils";

const { vol, fs } = require("memfs");

jest.mock("fs");

export class TestProxyController extends AbstractProxyController {
    numRun: number;
    numEnd: number;

    protected init (): void {
        this.numRun = 0;
        this.numEnd = 0;
    }
    protected run(): void { 
        this.numRun ++;
    }
    protected end(): void {
        this.numEnd ++;
    }
}

/**
 * Generate a string of length 100.000, and check its entropy is "ok"
 * The theoretical entropy should be log_2(64) = 6, but we will give a margin of 0.1
 */
test("controller.random.base64", () => {
    const size = 100_000;
    let string  = random_base64(size);
    let counter: { [key: string]: number } = {}

    for (let char of string) {
        if (counter[char] === undefined) counter[char] = 0;
        
        counter[char] ++;
    }

    let entropy = 0;
    for (let char of Object.keys(counter)) {
        let proba = counter[char] / size;

        entropy -= proba * Math.log2(proba);
    }

    expect(Object.keys(counter).length).toBe(64);
    expect(Object.keys(counter).sort().join("")).toBe("-/0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz")
    expect(entropy).toBeGreaterThan(5.99);
}, 0.1);
test("controller.random.base64.wrong_size", () => {
    try {
        random_base64(-1);
    } catch (error) {
        return ;
    }

    expect(false).toBe(true); /** should raise an exception if size < 0 */
})

test("controller.abstract.init", () => {
    vol.reset();

    const [log, warn, error] = createMockConsole();

    const config: NGProxyConfig = {}
    const context = new NGProxyContext(config);

    const startMutex = new FileMutex(context.loggerFactory.build("StartMutexLogger"), "/start.np");
    const proxy = new TestProxyController(
        context,
        startMutex,
        "/store.np"
    );

    expect(proxy.numRun).toBe(0);
    expect(proxy.numEnd).toBe(0);
    expect(error.mock.calls).toStrictEqual([  ]);
    expect(warn .mock.calls).toStrictEqual([  ]);
    expect(log  .mock.calls).toStrictEqual([  ]);
    returnToNormalConsole();
})

test("controller.abstract.init.unsync.storage", () => {
    vol.reset();
    vol.fromJSON({ "/store.np": "hi !" });

    const [log, warn, error] = createMockConsole();

    const config: NGProxyConfig = { logger: { defaultLogLevel: "danger" } }
    const context = new NGProxyContext(config);

    const startMutex = new FileMutex(context.loggerFactory.build("StartMutexLogger"), "/start.np");
    const proxy = new TestProxyController(
        context,
        startMutex,
        "/store.np"
    );
    
    expect(proxy.numRun).toBe(1);
    expect(proxy.numEnd).toBe(0);
    expect(error.mock.calls).toStrictEqual([ [ "The local file mutex responsible for storing the lock of the start mutex isn't synchronized with the potentially distant mutex" ] ]);
    expect(warn .mock.calls).toStrictEqual([  ]);
    expect(log  .mock.calls).toStrictEqual([  ]);
    returnToNormalConsole();
})
test("controller.abstract.init.unsync.start", () => {
    vol.reset();
    vol.fromJSON({ "/start.np": "hi !" });

    const [log, warn, error] = createMockConsole();

    const config: NGProxyConfig = { logger: { defaultLogLevel: "danger" } }
    const context = new NGProxyContext(config);

    const startMutex = new FileMutex(context.loggerFactory.build("StartMutexLogger"), "/start.np");
    const proxy = new TestProxyController(
        context,
        startMutex,
        "/store.np"
    );

    expect(proxy.numRun).toBe(0);
    expect(proxy.numEnd).toBe(0);
    expect(error.mock.calls).toStrictEqual([ [ "The local file mutex responsible for storing the lock of the start mutex isn't synchronized with the potentially distant mutex" ] ]);
    expect(warn .mock.calls).toStrictEqual([  ]);
    expect(log  .mock.calls).toStrictEqual([  ]);
    returnToNormalConsole();
})

test("controller.abstract.start.auth_size_undef", async () => {
    vol.reset();
    vol.fromJSON({  });

    const [log, warn, error] = createMockConsole();

    const config: NGProxyConfig = { logger: { defaultLogLevel: "danger" } }
    const context = new NGProxyContext(config);

    const startMutex = new FileMutex(context.loggerFactory.build("StartMutexLogger"), "/start.np");
    const proxy = new TestProxyController(
        context,
        startMutex,
        "/store.np"
    );
    const started = await proxy.start();
    expect(started).toBe(true);
    expect(proxy.localFileMutex.getCurrentAuthToken().length).toBe(20); // 20 is the default token size

    expect(proxy.numRun).toBe(1);
    expect(proxy.numEnd).toBe(0);
    expect(error.mock.calls).toStrictEqual([  ]);
    expect(warn .mock.calls).toStrictEqual([  ]);
    expect(log  .mock.calls).toStrictEqual([  ]);
    returnToNormalConsole();
});
test("controller.abstract.start.auth_size_def10", async () => {
    vol.reset();
    vol.fromJSON({  });

    const [log, warn, error] = createMockConsole();

    const config: NGProxyConfig = { logger: { defaultLogLevel: "danger" }, authTokenSize: 10 }
    const context = new NGProxyContext(config);

    const startMutex = new FileMutex(context.loggerFactory.build("StartMutexLogger"), "/start.np");
    const proxy = new TestProxyController(
        context,
        startMutex,
        "/store.np"
    );
    const started = await proxy.start();
    expect(started).toBe(true);
    expect(proxy.localFileMutex.getCurrentAuthToken().length).toBe(10);

    expect(proxy.numRun).toBe(1);
    expect(proxy.numEnd).toBe(0);
    expect(error.mock.calls).toStrictEqual([  ]);
    expect(warn .mock.calls).toStrictEqual([  ]);
    expect(log  .mock.calls).toStrictEqual([  ]);
    returnToNormalConsole();
});

test("controller.abstract.start.auth_size_less_than_zero", async () => {
    vol.reset();
    vol.fromJSON({  });

    const [log, warn, error] = createMockConsole();

    const config: NGProxyConfig = { logger: { defaultLogLevel: "danger" }, authTokenSize: -1 };
    const context = new NGProxyContext(config);

    const startMutex = new FileMutex(context.loggerFactory.build("StartMutexLogger"), "/start.np");
    const proxy = new TestProxyController(
        context,
        startMutex,
        "/store.np"
    );
    const started = await proxy.start();
    expect(started).toBe(true);
    expect(proxy.localFileMutex.getCurrentAuthToken().length).toBe(20); // 20 is the default token size

    expect(proxy.numRun).toBe(1);
    expect(proxy.numEnd).toBe(0);
    expect(error.mock.calls).toStrictEqual([ [ "ImproperConfigurationDanger, AuthTokenSize <= 0, falling back to default" ] ]);
    expect(warn .mock.calls).toStrictEqual([  ]);
    expect(log  .mock.calls).toStrictEqual([  ]);
    returnToNormalConsole();
});

test("controller.abstract.start.no_permission_on_start", async () => {
    vol.reset();
    vol.fromJSON({  });

    const [log, warn, error] = createMockConsole();
    const wrfs = fs.writeFileSync;
    fs.writeFileSync = (path: any, data: any) => { if (path == "/start.np") throw "Permission error on write."; else wrfs(path, data); }

    const config: NGProxyConfig = { logger: { defaultLogLevel: "danger" } };
    const context = new NGProxyContext(config);

    const startMutex = new FileMutex(context.loggerFactory.build("StartMutexLogger"), "/start.np");
    const proxy = new TestProxyController(
        context,
        startMutex,
        "/store.np"
    );
    const started = await proxy.start();
    expect(started).toBe(false);

    expect(proxy.numRun).toBe(0);
    expect(proxy.numEnd).toBe(0);
    expect(error.mock.calls).toStrictEqual([ [ "Could not write lock to file /start.np, because Permission error on write." ] ]);
    expect(warn .mock.calls).toStrictEqual([  ]);
    expect(log  .mock.calls).toStrictEqual([  ]);
    returnToNormalConsole();
    
    fs.writeFileSync = wrfs;
});
test("controller.abstract.start.no_permission_on_store", async () => {
    vol.reset();
    vol.fromJSON({  });

    const [log, warn, error] = createMockConsole();
    const wrfs = fs.writeFileSync;
    fs.writeFileSync = (path: any, data: any) => { if (path == "/store.np") throw "Permission error on write."; else wrfs(path, data); }

    const config: NGProxyConfig = { logger: { defaultLogLevel: "danger" } };
    const context = new NGProxyContext(config);

    const startMutex = new FileMutex(context.loggerFactory.build("StartMutexLogger"), "/start.np");
    const proxy = new TestProxyController(
        context,
        startMutex,
        "/store.np"
    );
    const started = await proxy.start();
    expect(started).toBe(false);

    expect(proxy.numRun).toBe(0);
    expect(proxy.numEnd).toBe(0);
    expect(error.mock.calls).toStrictEqual([ [ "Could not write lock to file /store.np, because Permission error on write." ] ]);
    expect(warn .mock.calls).toStrictEqual([  ]);
    expect(log  .mock.calls).toStrictEqual([  ]);
    returnToNormalConsole();
    
    fs.writeFileSync = wrfs;
});
test("controller.abstract.start.already_locked", async () => {
    vol.reset();
    vol.fromJSON({ "/store.np": "hi !", "/start.np": "hi !" });

    const [log, warn, error] = createMockConsole();

    const config: NGProxyConfig = { logger: { defaultLogLevel: "danger" } }
    const context = new NGProxyContext(config);

    const startMutex = new FileMutex(context.loggerFactory.build("StartMutexLogger"), "/start.np");
    const proxy = new TestProxyController(
        context,
        startMutex,
        "/store.np"
    );
    const started = await proxy.start();
    expect(started).toBe(false);
    expect(proxy.localFileMutex.getCurrentAuthToken()).toBe("hi !");

    expect(proxy.numRun).toBe(1);
    expect(proxy.numEnd).toBe(0);
    expect(error.mock.calls).toStrictEqual([  ]);
    expect(warn .mock.calls).toStrictEqual([  ]);
    expect(log  .mock.calls).toStrictEqual([  ]);
    returnToNormalConsole();
})
test("controller.abstract.start.no_permission_on_store_and_cant_remove_start", async () => {
    vol.reset();
    vol.fromJSON({  });

    const [log, warn, error] = createMockConsole();
    const wrfs = fs.writeFileSync;
    fs.writeFileSync = (path: any, data: any) => { if (path == "/store.np") throw "Permission error on write."; else wrfs(path, data); }
    const rmfs = fs.rmSync;
    fs.rmSync = (path: any) => { if (path == "/start.np") throw "Permission error on remove"; }

    const config: NGProxyConfig = { logger: { defaultLogLevel: "danger" } };
    const context = new NGProxyContext(config);

    const startMutex = new FileMutex(context.loggerFactory.build("StartMutexLogger"), "/start.np");
    const proxy = new TestProxyController(
        context,
        startMutex,
        "/store.np"
    );
    const started = await proxy.start();
    expect(started).toBe(false);

    expect(proxy.numRun).toBe(0);
    expect(proxy.numEnd).toBe(0);
    expect(error.mock.calls).toStrictEqual([
        [ 
            "Could not write lock to file /store.np, because Permission error on write."
        ],
        [
            "Could not remove lock file /start.np: \"Permission error on remove\""
        ],
        [
            "Could not free start mutex after exception, the proxy might need a restart due to a softlock."
        ]
    ]);
    expect(warn .mock.calls).toStrictEqual([  ]);
    expect(log  .mock.calls).toStrictEqual([  ]);
    returnToNormalConsole();
    
    fs.writeFileSync = wrfs;
    fs.rmSync = rmfs;
});
test("controller.abstract.close.not_started", async () => {
    vol.reset();
    vol.fromJSON({  });

    const [log, warn, error] = createMockConsole();

    const config: NGProxyConfig = { logger: { defaultLogLevel: "danger" } }
    const context = new NGProxyContext(config);

    const startMutex = new FileMutex(context.loggerFactory.build("StartMutexLogger"), "/start.np");
    const proxy = new TestProxyController(
        context,
        startMutex,
        "/store.np"
    );
    const closed = await proxy.close();
    expect(closed).toBe(false);

    expect(proxy.numRun).toBe(0);
    expect(proxy.numEnd).toBe(0);
    expect(error.mock.calls).toStrictEqual([  ]);
    expect(warn .mock.calls).toStrictEqual([  ]);
    expect(log  .mock.calls).toStrictEqual([  ]);
    returnToNormalConsole();
});

test("controller.abstract.close.no_perm_to_free_storage", async () => {
    vol.reset();
    vol.fromJSON({  });
    const rmfs = fs.rmSync;
    fs.rmSync = (path: any) => { if (path == "/store.np") throw "Permission error on remove"; }

    const [log, warn, error] = createMockConsole();

    const config: NGProxyConfig = { logger: { defaultLogLevel: "danger" } }
    const context = new NGProxyContext(config);

    const startMutex = new FileMutex(context.loggerFactory.build("StartMutexLogger"), "/start.np");
    const proxy = new TestProxyController(
        context,
        startMutex,
        "/store.np"
    );
    await proxy.start();
    
    const closed = await proxy.close();
    expect(closed).toBe(false);

    expect(proxy.numRun).toBe(1);
    expect(proxy.numEnd).toBe(0);
    expect(error.mock.calls).toStrictEqual([ [ "Could not remove lock file /store.np: \"Permission error on remove\"" ] ]);
    expect(warn .mock.calls).toStrictEqual([  ]);
    expect(log  .mock.calls).toStrictEqual([  ]);
    returnToNormalConsole();

    fs.rmSync = rmfs;
});
test("controller.abstract.close.no_perm_to_free_start", async () => {
    vol.reset();
    vol.fromJSON({  });
    const rmfs = fs.rmSync;
    fs.rmSync = (path: any) => { if (path == "/start.np") throw "Permission error on remove"; }

    const [log, warn, error] = createMockConsole();

    const config: NGProxyConfig = { logger: { defaultLogLevel: "danger" } }
    const context = new NGProxyContext(config);

    const startMutex = new FileMutex(context.loggerFactory.build("StartMutexLogger"), "/start.np");
    const proxy = new TestProxyController(
        context,
        startMutex,
        "/store.np"
    );
    await proxy.start();
    
    const closed = await proxy.close();
    expect(closed).toBe(false);

    expect(proxy.numRun).toBe(1);
    expect(proxy.numEnd).toBe(0);
    expect(error.mock.calls).toStrictEqual([ [ "Could not remove lock file /start.np: \"Permission error on remove\"" ] ]);
    expect(warn .mock.calls).toStrictEqual([  ]);
    expect(log  .mock.calls).toStrictEqual([  ]);
    returnToNormalConsole();

    fs.rmSync = rmfs;
});
test("controller.abstract.close.no_perm_to_free_start_and_relock", async () => {
    vol.reset();
    vol.fromJSON({ "/store.np": "hi !", "/start.np": "hi !" });
    const rmfs = fs.rmSync;
    fs.rmSync = (path: any) => { if (path == "/start.np") throw "Permission error on remove"; }
    const wrfs = fs.writeFileSync;
    fs.writeFileSync = (path: any) => { throw "Permission error on write"; }

    const [log, warn, error] = createMockConsole();

    const config: NGProxyConfig = { logger: { defaultLogLevel: "danger" } }
    const context = new NGProxyContext(config);

    const startMutex = new FileMutex(context.loggerFactory.build("StartMutexLogger"), "/start.np");
    const proxy = new TestProxyController(
        context,
        startMutex,
        "/store.np"
    );
    
    const closed = await proxy.close();
    expect(closed).toBe(false);

    expect(proxy.numRun).toBe(1);
    expect(proxy.numEnd).toBe(0);
    expect(error.mock.calls).toStrictEqual([
        [ "Could not remove lock file /start.np: \"Permission error on remove\"" ],
        [ "Could not write lock to file /store.np, because Permission error on write" ],
        [ "Could not relock local file after unsync, the client might be soft locked." ]
    ]);
    expect(warn .mock.calls).toStrictEqual([  ]);
    expect(log  .mock.calls).toStrictEqual([  ]);
    returnToNormalConsole();

    fs.rmSync = rmfs;
    fs.writeFileSync = wrfs;
});
test("controller.abstract.close.start_and_close", async () => {
    vol.reset();
    vol.fromJSON({ "/store.np": "hi !", "/start.np": "hi !" });
    
    const [log, warn, error] = createMockConsole();

    const config: NGProxyConfig = { logger: { defaultLogLevel: "danger" } }
    const context = new NGProxyContext(config);

    const startMutex = new FileMutex(context.loggerFactory.build("StartMutexLogger"), "/start.np");
    const proxy = new TestProxyController(
        context,
        startMutex,
        "/store.np"
    );
    await proxy.start();
    const closed = await proxy.close();
    expect(closed).toBe(true);

    expect(proxy.numRun).toBe(1);
    expect(proxy.numEnd).toBe(1);
    expect(error.mock.calls).toStrictEqual([  ]);
    expect(warn .mock.calls).toStrictEqual([  ]);
    expect(log  .mock.calls).toStrictEqual([  ]);
    returnToNormalConsole();
});
test("controller.abstract.close.close_restarted", async () => {
    vol.reset();
    vol.fromJSON({ "/store.np": "hi !", "/start.np": "hi !" });
    
    const [log, warn, error] = createMockConsole();

    const config: NGProxyConfig = { logger: { defaultLogLevel: "danger" } }
    const context = new NGProxyContext(config);

    const startMutex = new FileMutex(context.loggerFactory.build("StartMutexLogger"), "/start.np");
    const proxy = new TestProxyController(
        context,
        startMutex,
        "/store.np"
    );
    const closed = await proxy.close();
    expect(closed).toBe(true);

    expect(proxy.numRun).toBe(1);
    expect(proxy.numEnd).toBe(1);
    expect(error.mock.calls).toStrictEqual([  ]);
    expect(warn .mock.calls).toStrictEqual([  ]);
    expect(log  .mock.calls).toStrictEqual([  ]);
    returnToNormalConsole();
});