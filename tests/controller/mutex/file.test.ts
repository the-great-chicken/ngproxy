import { FileMutex } from "../../../ngproxy/controller/mutex/file";
import { LoggerFactory } from "../../../ngproxy/logger";
import { createMockConsole, returnToNormalConsole } from "../../utils";

const { vol, fs } = require("memfs");

jest.mock("fs");

function test_mutex (mutex: FileMutex, file: string, expects: string) {
    expect(mutex.getCurrentAuthToken()).toStrictEqual(expects);

    try {
        let buffer = fs.readFileSync(file, "utf-8");
        expect(expects).toStrictEqual(buffer);
    } catch (error) {
        expect(expects).toStrictEqual(undefined);
    }
}

test("mutex.file.empty_volume.create", () => {
    vol.reset();
    vol.fromJSON({});

    const config = {};
    const logger = new LoggerFactory(config).build("FileMutex");
    
    let mutex = new FileMutex( logger, "/mutex.np" );
    test_mutex(mutex, "/mutex.np", undefined);
});
test("mutex.file.empty_volume.acquire", async () => {
    vol.reset();
    vol.fromJSON({});

    const config = {};
    const logger = new LoggerFactory(config).build("FileMutex");
    
    let mutex = new FileMutex( logger, "/mutex.np" );
    expect(await mutex.lock("credentials")).toBe(true);
    test_mutex(mutex, "/mutex.np", "credentials");
    expect(await mutex.lock("credentials2")).toBe(false);
    test_mutex(mutex, "/mutex.np", "credentials");
});
test("mutex.file.mutex_is_folder", async () => {
    const [ log, warn, error ] = createMockConsole();
    vol.reset();
    vol.fromJSON({ "/mutex.np/test": "hello, world !" });

    const config = {};
    const logger = new LoggerFactory(config).build("FileMutex");

    let mutex = new FileMutex( logger, "/mutex.np" );
    expect(error.mock.calls).toStrictEqual([ [ "Could not read lock from file /mutex.np as it is a directory" ] ]);
    expect(warn .mock.calls).toStrictEqual([  ]);
    expect(log  .mock.calls).toStrictEqual([  ]);
    returnToNormalConsole();
});
test("mutex.file.free", async () => {
    const [ log, warn, error ] = createMockConsole();
    vol.reset();
    vol.fromJSON({ "/mutex.np": "hello, world !" });

    const config = {};
    const logger = new LoggerFactory(config).build("FileMutex");

    let mutex = new FileMutex( logger, "/mutex.np" );
    test_mutex(mutex, "/mutex.np", "hello, world !");
    await mutex.free("hi");
    test_mutex(mutex, "/mutex.np", "hello, world !");
    await mutex.free("hello, world !");
    test_mutex(mutex, "/mutex.np", undefined);
    await mutex.free("hello, world !");
    test_mutex(mutex, "/mutex.np", undefined);
    expect(error.mock.calls).toStrictEqual([  ]);
    expect(warn .mock.calls).toStrictEqual([  ]);
    expect(log  .mock.calls).toStrictEqual([  ]);
    returnToNormalConsole();
});

test("mutex.file.no_permissions.read", async () => {
    const [ log, warn, error ] = createMockConsole();
    vol.reset();
    vol.fromJSON({ "/mutex.np": "hello, world !" });
    fs.chmodSync("/mutex.np", 0);

    const config = {};
    const logger = new LoggerFactory(config).build("FileMutex");

    let mutex = new FileMutex( logger, "/mutex.np" );
    expect(error.mock.calls).toStrictEqual([ [ "Could not read lock from file /mutex.np because Error: EACCES: permission denied, open '/mutex.np'" ] ]);
    expect(warn .mock.calls).toStrictEqual([  ]);
    expect(log  .mock.calls).toStrictEqual([  ]);
    returnToNormalConsole();
})
test("mutex.file.no_permissions.write", async () => {
    const [ log, warn, error ] = createMockConsole();
    vol.reset();
    vol.fromJSON({});
    const wrfs = fs.writeFileSync;
    fs.writeFileSync = () => { throw "Permission error on write."; }

    const config = {};
    const logger = new LoggerFactory(config).build("FileMutex");

    let mutex = new FileMutex( logger, "/mutex.np" );
    await mutex.lock("hello, world !");
    test_mutex(mutex, "/mutex.np", undefined);
    expect(error.mock.calls).toStrictEqual([ [ "Could not write lock to file /mutex.np, because Permission error on write." ] ]);
    expect(warn .mock.calls).toStrictEqual([  ]);
    expect(log  .mock.calls).toStrictEqual([  ]);
    returnToNormalConsole();
    fs.writeFileSync = wrfs;
})
test("mutex.file.no_permissions.remove", async () => {
    const [ log, warn, error ] = createMockConsole();
    vol.reset();
    vol.fromJSON({ "/mutex.np": "hello, world !" });
    const rmSync = fs.rmSync;
    fs.rmSync = () => { throw "Permission error on remove"; }

    const config = {};
    const logger = new LoggerFactory(config).build("FileMutex");

    let mutex = new FileMutex( logger, "/mutex.np" );
    mutex.free("hello, world !");
    expect(error.mock.calls).toStrictEqual([ [ "Could not remove lock file /mutex.np: \"Permission error on remove\"" ] ]);
    expect(warn .mock.calls).toStrictEqual([  ]);
    expect(log  .mock.calls).toStrictEqual([  ]);
    returnToNormalConsole();

    fs.rmSync = rmSync;
})
test("mutex.file.stress", async () => {
    const [ log, warn, error ] = createMockConsole();
    vol.reset();

    const config = {};
    const logger = new LoggerFactory(config).build("FileMutex");

    let mutex = new FileMutex( logger, "/mutex.np" );
    
    for (let idx = 0; idx < 100; idx ++) {
        let string = "";
        for (let jdx = 0; jdx < 20; jdx ++)
            string += ("abcdefghijklmnopqrstuvwxyz")[Math.floor(Math.random() * 26)]
        
        expect(await mutex.lock(string)).toBe(true);
        test_mutex(mutex, "/mutex.np", string);
        expect(await mutex.free(string)).toBe(true);
        test_mutex(mutex, "/mutex.np", undefined);
    }

    expect(error.mock.calls).toStrictEqual([  ]);
    expect(warn .mock.calls).toStrictEqual([  ]);
    expect(log  .mock.calls).toStrictEqual([  ]);
    returnToNormalConsole();
})
