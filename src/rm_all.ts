import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
	const filenames = ns.ls(ns.getHostname()).filter(filename => filename.indexOf(".js") !== -1);

	for (const filename of filenames) {
		ns.rm(filename);
	}
}