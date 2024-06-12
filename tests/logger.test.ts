
import { NGProxyConfig } from "../ngproxy/config";
import { DBG_LEVEL, INF_LEVEL, WRN_LEVEL, DGR_LEVEL, ERR_LEVEL, LogLevel, Logger, LoggerFactory, NO_LOGS } from "../ngproxy/logger";

const log_copy = console.log;
const wrn_copy = console.warn;
const err_copy = console.error;

function error_call (log: string) {
    return [ `Wrong name for log level : ${log}` ]
}

test('logger.level.index', () => {
    expect( DBG_LEVEL.index ).toBe( 4 );
    expect( INF_LEVEL.index ).toBe( 3 );
    expect( WRN_LEVEL.index ).toBe( 2 );
    expect( DGR_LEVEL.index ).toBe( 1 );
    expect( ERR_LEVEL.index ).toBe( 0 );
});
test('logger.level.name', () => {
    expect( DBG_LEVEL.name ).toBe( "DBG" );
    expect( INF_LEVEL.name ).toBe( "INF" );
    expect( WRN_LEVEL.name ).toBe( "WRN" );
    expect( DGR_LEVEL.name ).toBe( "DGR" );
    expect( ERR_LEVEL.name ).toBe( "ERR" );
});
test('logger.logger.index_check', () => {
    for (let i = 0; i < 5; i ++) {
        let found = false;
        const maxLogLevel = new LogLevel( i, `test.level.${i}`, () => (...data: any[]) => { found = true; } );
        const logger = new Logger( `test.logger.${i}`, maxLogLevel );
        for (let j = 0; j < 5; j ++) {
            const logLevel = new LogLevel( j, `test.level.${j}`, () => (...data: any[]) => { found = true; } );

            logger.log(logLevel);

            expect(found).toBe(i >= j);
            found = false;
        }
    }
});

test('logger.factory.convert', () => {
    const factory = new LoggerFactory({
        logger: {
            loggerFactoryLevel: "none"
        }
    });
    const testName = (level: LogLevel | undefined, name: string | undefined) => {
        expect(
            factory.convertToLogLevel(name)
        ).toBe(level)
    }
    
    testName(ERR_LEVEL, "error");
    testName(DGR_LEVEL, "danger");
    testName(WRN_LEVEL, "warning");
    testName(INF_LEVEL, "info");
    testName(DBG_LEVEL, "debug");

    testName(NO_LOGS, "none");

    testName(undefined, "undefined");
    testName(undefined, undefined);
});
test('logger.factory.default.wrong_level', () => {
    const log   = jest.fn(); console.log   = log;
    const warn  = jest.fn(); console.warn  = warn;
    const error = jest.fn(); console.error = error;

    let factory: LoggerFactory;
    factory = new LoggerFactory({ logger: { loggerFactoryLevel: "err0" } });
    expect(warn.mock.calls.length).toBe(1);
    expect(warn.mock.calls[0]).toStrictEqual(error_call("err0"));
    expect(factory.logger.maxLevel).toBe(ERR_LEVEL);
    factory = new LoggerFactory({ logger: { defaultLogLevel: "err1" } });
    expect(warn.mock.calls.length).toBe(2);
    expect(warn.mock.calls[1]).toStrictEqual(error_call("err1"));
    expect(factory.logger.maxLevel).toBe(ERR_LEVEL);
    factory = new LoggerFactory({ logger: { loggerFactoryLevel: "danger", defaultLogLevel: "err1" } });
    expect(warn.mock.calls.length).toBe(2);
    expect(factory.logger.maxLevel).toBe(DGR_LEVEL);
    factory = new LoggerFactory({});
    expect(warn.mock.calls.length).toBe(2);
    expect(factory.logger.maxLevel).toBe(ERR_LEVEL);
});
test('logger.factory.build', () => {
    const log   = jest.fn(); console.log   = log;
    const warn  = jest.fn(); console.warn  = warn;
    const error = jest.fn(); console.error = error;

    for (let factoryLogLevel of [ undefined, "warning" ]) {
        for (let defaultLogLevel of [ undefined, "danger", "dgr" ]) {
            const loggerName = "test_logger";

            for (let displayName of [ undefined, "display_logger" ]) {
                for (let loggerLogLevel of [ undefined, "info", "inf" ]) {
                    const config: NGProxyConfig = {
                        logger: {
                            defaultLogLevel: defaultLogLevel,
                            loggerFactoryLevel: factoryLogLevel,
                            loggers: {}
                        }
                    }
                    config.logger.loggers[loggerName] = { displayName: displayName, logLevel: loggerLogLevel };

                    const displayNameExpec = displayName    ?? loggerName;

                    const logLevelExpected =
                           (loggerLogLevel  == "info"   ? INF_LEVEL : undefined)
                        ?? (defaultLogLevel == "danger" ? DGR_LEVEL : undefined)
                        ?? ERR_LEVEL;

                    let offset = warn.mock.calls.length;
                    const logger = new LoggerFactory(config).build( loggerName );
                    expect(logger.name).toBe(displayNameExpec);
                    expect(logger.maxLevel).toBe(logLevelExpected);
                    if (factoryLogLevel) {
                        if (loggerLogLevel == "inf") {
                            expect(warn.mock.calls.length).toBeGreaterThan(offset);
                            expect(warn.mock.calls[offset]).toStrictEqual( error_call("inf") );
                            offset ++;
                        }
                        if (loggerLogLevel != "info" && defaultLogLevel == "dgr") {
                            expect(warn.mock.calls.length).toBeGreaterThan(offset);
                            expect(warn.mock.calls[offset]).toStrictEqual( error_call("dgr") );
                            offset ++;
                        }
                    } else if (defaultLogLevel == "dgr") {
                        expect(warn.mock.calls.length).toBeGreaterThan(offset);
                        expect(warn.mock.calls[offset]).toStrictEqual( error_call("dgr") );
                        offset ++;
                    }
                    
                    expect(warn.mock.calls.length).toBe(offset);
                }
            }
        }
    }

    let offset = warn.mock.calls.length;
    const config = {};
    let logger = new LoggerFactory(config).build( "logger" );
    expect(warn.mock.calls.length).toBe(offset);
    expect(logger.maxLevel).toBe(ERR_LEVEL);
});
test('logger.log', () => {
    const log   = jest.fn(); console.log   = log;
    const warn  = jest.fn(); console.warn  = warn;
    const error = jest.fn(); console.error = error;

    const logger = new Logger( "TestLogger", DBG_LEVEL );

    logger.log(NO_LOGS, "Never printed");
    logger.log(ERR_LEVEL, "Error");
    logger.log(DGR_LEVEL, "Danger");
    logger.log(WRN_LEVEL, "Warning");
    logger.log(INF_LEVEL, "Info");
    logger.log(DBG_LEVEL, "Debug");

    expect(error.mock.calls).toStrictEqual([ [ "Error" ], [ "Danger" ] ]);
    expect(warn.mock.calls).toStrictEqual([ [ "Warning" ] ]);
    expect(log.mock.calls).toStrictEqual([ [ "Info" ], [ "Debug" ] ]);
});
