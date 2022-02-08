import { NS } from '@ns'
function isScript(filename: string) {
    return filename.indexOf(".js") != -1;
}

function isProgram(filename: string) {
    return filename.indexOf(".exe") != -1;
}

function isOther(filename: string) {
    return !isScript(filename) && !isProgram(filename);
}

export async function main(ns : NS) : Promise<void> {
    let hostname = ns.getHostname();
    if (ns.args[0] && ns.serverExists(ns.args[0].toString())) {
        hostname = ns.args[0].toString();
    }

    const filenames = ns.ls(hostname);
    const scriptnames = filenames.filter(isScript);
    const programnames = filenames.filter(isProgram);
    const othernames = filenames.filter(isOther);

    let maxFileLength = 0;
    scriptnames.map(function (name) {
        const len = name.length + 2
        if (len > maxFileLength) maxFileLength = len;
    });

    if (scriptnames.length) {
        ns.tprintf("======== SCRIPTS ========");
        for (const filename of scriptnames)
            ns.tprintf(
                `  %-${maxFileLength}s %7.2fGB %s`,
                filename,
                ns.getScriptRam(filename, hostname),
                ns.scriptRunning(filename, hostname) ? "RUNNING" : ""
            );
    }

    if (programnames.length) {
        ns.tprintf("======== PROGRAMS =======");
        for (const filename of programnames) ns.tprintf(`  %-${maxFileLength}s`, filename);
    }

    if (othernames.length) {
        ns.tprintf("========= OTHER =========");
        for (const filename of othernames) ns.tprintf(`  %-${maxFileLength}s`, filename);
    }
}