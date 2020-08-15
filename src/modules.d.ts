declare module 'network' {
    type Interface = {
        name: string
    }

    const module: {
        get_active_interface: (callback: (error: Error | null, interface: Interface) => void) => void
    };

    export default module;
}

declare module 'arpping' {
    export type ArppingEntry = {
        ip: string
        mac: string
    }

    class Arpping {
      constructor(options: {}) // eslint-disable-line
      discover(ip: string): Promise<ArppingEntry[]>
    }

    export default Arpping;
}