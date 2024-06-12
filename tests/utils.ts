
let log, warn, error;

export function createMockConsole (): jest.Mock[] {
    log = console.log;
    warn = console.warn;
    error = console.error;
    let _log = jest.fn(); let _warn = jest.fn(); let _error = jest.fn();
    console.log =_log ; console.warn = _warn; console.error = _error;

    return [ _log, _warn, _error ];
}
export function returnToNormalConsole () {
    console.log = log;
    console.warn = warn;
    console.error = error;
}
