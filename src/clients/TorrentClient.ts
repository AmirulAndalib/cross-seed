import { Metafile } from "../parseTorrent.js";
import {
	Decision,
	DecisionAnyMatch,
	InjectionResult,
	VIDEO_DISC_EXTENSIONS,
} from "../constants.js";
import { getRuntimeConfig } from "../runtimeConfig.js";
import { Searchee, SearcheeWithInfoHash } from "../searchee.js";
import QBittorrent from "./QBittorrent.js";
import RTorrent from "./RTorrent.js";
import Transmission from "./Transmission.js";
import Deluge from "./Deluge.js";
import { Result } from "../Result.js";
import { Label } from "../logger.js";
import { hasExt } from "../utils.js";

let activeClient: TorrentClient | null = null;

export type TorrentClientType =
	| Label.QBITTORRENT
	| Label.RTORRENT
	| Label.TRANSMISSION
	| Label.DELUGE;

export interface GenericTorrentInfo {
	infoHash: string;
	category: string;
	tags: string[];
	trackers?: string[][];
}

export interface TorrentClient {
	type: TorrentClientType;
	isTorrentComplete: (
		infoHash: string,
	) => Promise<Result<boolean, "NOT_FOUND">>;
	getAllTorrents: () => Promise<GenericTorrentInfo[]>;
	getDownloadDir: (
		meta: SearcheeWithInfoHash | Metafile,
		options: { onlyCompleted: boolean },
	) => Promise<
		Result<string, "NOT_FOUND" | "TORRENT_NOT_COMPLETE" | "UNKNOWN_ERROR">
	>;
	getAllDownloadDirs: (options: {
		metas: SearcheeWithInfoHash[] | Metafile[];
		onlyCompleted: boolean;
	}) => Promise<Map<string, string>>;
	inject: (
		newTorrent: Metafile,
		searchee: Searchee,
		decision: DecisionAnyMatch,
		path?: string,
	) => Promise<InjectionResult>;
	recheckTorrent: (infoHash: string) => Promise<void>;
	validateConfig: () => Promise<void>;
}

function instantiateDownloadClient() {
	const { rtorrentRpcUrl, qbittorrentUrl, transmissionRpcUrl, delugeRpcUrl } =
		getRuntimeConfig();
	if (rtorrentRpcUrl) {
		activeClient = new RTorrent();
	} else if (qbittorrentUrl) {
		activeClient = new QBittorrent();
	} else if (transmissionRpcUrl) {
		activeClient = new Transmission();
	} else if (delugeRpcUrl) {
		activeClient = new Deluge();
	}
}

export function getClient(): TorrentClient | null {
	if (!activeClient) {
		instantiateDownloadClient();
	}
	return activeClient;
}

export function shouldRecheck(
	searchee: Searchee,
	decision: DecisionAnyMatch,
): boolean {
	if (decision === Decision.MATCH_PARTIAL) return true;
	if (hasExt(searchee.files, VIDEO_DISC_EXTENSIONS)) return true;
	return false; // Skip for MATCH | MATCH_SIZE_ONLY
}
