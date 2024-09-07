/**
 * parsing and processing of CLI and config file
 */
import { Option, program } from "commander";
import { FileConfig, getFileConfig } from "./configuration.js";
import { Action, LinkType, MatchMode } from "./constants.js";
import { CrossSeedError } from "./errors.js";
import { fallback } from "./utils.js";

let fileConfig: FileConfig;
try {
	fileConfig = await getFileConfig();
} catch (e) {
	if (e instanceof CrossSeedError) {
		console.error(e.message);
		process.exit(1);
	}
	throw e;
}

const torznabOption = new Option(
	"-T, --torznab <urls...>",
	"Torznab urls with apikey included (separated by spaces)",
).default(fallback(fileConfig.torznab));

const dataDirsOption = new Option(
	"--data-dirs <dirs...>",
	"Directories to use if searching by data instead of torrents (separated by spaces)",
).default(fallback(fileConfig.dataDirs));

const matchModeOption = new Option(
	"--match-mode <mode>",
	"Safe will only download torrents with perfect matches. Risky will allow for renames and more matches, but might cause false positives. Partial is like risky but it ignores small files like .nfo/.srt if missing.",
)
	.default(fallback(fileConfig.matchMode, MatchMode.SAFE))
	.choices(Object.values(MatchMode));

const linkCategoryOption = new Option(
	"--link-category <cat>",
	"Torrent client category to set on linked torrents",
).default(fallback(fileConfig.linkCategory, "cross-seed-link"));

const linkDirOption = new Option(
	"--link-dir <dir>",
	"Directory to output data-matched hardlinks to",
).default(fileConfig.linkDir);

const flatLinkingOption = new Option(
	"--flat-linking",
	"Use flat linking directory structure (without individual tracker folders)",
).default(fallback(fileConfig.flatLinking, false));

const linkTypeOption = new Option(
	"--link-type <type>",
	"Use links of this type to inject data-based matches into your client",
)
	.default(fallback(fileConfig.linkType, LinkType.SYMLINK))
	.choices(Object.values(LinkType))
	.makeOptionMandatory();

const maxDataDepthOption = new Option(
	"--max-data-depth <depth>",
	"Max depth to look for searchees in dataDirs",
)
	.default(fallback(fileConfig.maxDataDepth, 2))
	.argParser((n) => parseInt(n));

const torrentDirOption = new Option(
	"-i, --torrent-dir <dir>",
	"Directory with torrent files",
).default(fileConfig.torrentDir);

const outputDirOption = new Option(
	"-s, --output-dir <dir>",
	"Directory to save results in",
).default(fileConfig.outputDir);

const includeNonVideosOption = new Option(
	"--include-non-videos",
	"Include torrents which contain non-video files",
).default(fallback(fileConfig.includeNonVideos, false));

const noIncludeNonVideosOption = new Option(
	"--no-include-non-videos",
	"Don't include torrents which contain non-videos",
);

const includeSingleEpisodesOption = new Option(
	"--include-single-episodes",
	"Include single episode torrents in the search",
).default(fallback(fileConfig.includeSingleEpisodes, false));

const fuzzySizeThresholdOption = new Option(
	"--fuzzy-size-threshold <decimal>",
	"The size difference allowed to be considered a match.",
)
	.argParser(parseFloat)
	.default(fallback(fileConfig.fuzzySizeThreshold, 0.02));

const excludeOlderOption = new Option(
	"-x, --exclude-older <cutoff>",
	"Exclude torrents first seen more than n minutes ago. Bypasses the -a flag.",
).default(fileConfig.excludeOlder);

const excludeRecentSearchOption = new Option(
	"-r, --exclude-recent-search <cutoff>",
	"Exclude torrents which have been searched more recently than n minutes ago. Bypasses the -a flag.",
).default(fileConfig.excludeRecentSearch);

const noExcludeOlderOption = new Option(
	"--no-exclude-older",
	"Don't Exclude torrents based on when they were first seen.",
);

const noExcludeRecentSearchOption = new Option(
	"--no-exclude-recent-search",
	"Don't Exclude torrents based on when they were last searched.",
);

const verboseOption = new Option("-v, --verbose", "Log verbose output").default(
	false,
);

const actionOption = new Option(
	"-A, --action <action>",
	"If set to 'inject', cross-seed will attempt to add the found torrents to your torrent client.",
)
	.default(fallback(fileConfig.action, Action.SAVE))
	.choices(Object.values(Action));

const rtorrentRpcUrlOption = new Option(
	"--rtorrent-rpc-url <url>",
	"The url of your rtorrent XMLRPC interface. Requires '-A inject'. See the docs for more information.",
).default(fileConfig.rtorrentRpcUrl);

const qbittorrentUrlOption = new Option(
	"--qbittorrent-url <url>",
	"The url of your qBittorrent webui. Requires '-A inject'. See the docs for more information.",
).default(fileConfig.qbittorrentUrl);

const transmissionRpcUrlOption = new Option(
	"--transmission-rpc-url <url>",
	"The url of your Transmission RPC interface. Requires '-A inject'. See the docs for more information.",
).default(fileConfig.transmissionRpcUrl);

const delugeRpcUrlOption = new Option(
	"--deluge-rpc-url <url>",
	"The url of your Deluge JSON-RPC interface. Requires '-A inject'. See the docs for more information.",
).default(fileConfig.delugeRpcUrl);

const duplicateCategoriesOption = new Option(
	"--duplicate-categories",
	"Create and inject using categories with the same save paths as your normal categories",
).default(fallback(fileConfig.duplicateCategories, false));

export const notificationWebhookUrlOption = new Option(
	"--notification-webhook-url <url>",
	"cross-seed will send POST requests to this url with a JSON payload of { title, body }",
).default(fileConfig.notificationWebhookUrl);

const delayOption = new Option(
	"-d, --delay <delay>",
	"Pause duration (seconds) between searches",
)
	.argParser(parseFloat)
	.default(fallback(fileConfig.delay, 10));

const snatchTimeoutOption = new Option(
	"--snatch-timeout <timeout>",
	"Timeout for unresponsive snatches",
).default(fallback(fileConfig.snatchTimeout, "30 seconds)"));

const searchTimeoutOption = new Option(
	"--search-timeout <timeout>",
	"Timeout for unresponsive searches",
).default(fallback(fileConfig.searchTimeout, "30 seconds)"));

const searchLimitOption = new Option(
	"--search-limit <number>",
	"The number of searches before stops",
)
	.argParser((n) => parseInt(n))
	.default(fallback(fileConfig.searchLimit, 0));

const blockListOption = new Option(
	"--block-list <strings...>",
	"The infohashes and/or strings in torrent name to block from cross-seed",
).default(fallback(fileConfig.blockList, []));

const sonarrOption = new Option(
	"--sonarr <urls...>",
	"Sonarr API URL(s)",
).default(fileConfig.sonarr);

const radarrOption = new Option(
	"--radarr <urls...>",
	"Radarr API URL(s)",
).default(fileConfig.radarr);

export const apiKeyOption = new Option(
	"--api-key <key>",
	"Provide your own API key to override the autogenerated one.",
).default(fileConfig.apiKey);

export const portOption = new Option(
	"-p, --port <port>",
	"Listen on a custom port",
)
	.argParser((n) => parseInt(n))
	.default(fallback(fileConfig.port, 2468));

export const noPortOption = new Option(
	"--no-port",
	"Do not listen on any port",
);

export const hostOption = new Option(
	"--host <host>",
	"Bind to a specific IP address",
).default(fileConfig.host);

export const searchCadenceOption = new Option(
	"--search-cadence <cadence>",
	"Run searches on a schedule. Format: https://github.com/vercel/ms",
).default(fileConfig.searchCadence);

export const rssCadenceOption = new Option(
	"--rss-cadence <cadence>",
	"Run an rss scan on a schedule. Format: https://github.com/vercel/ms",
).default(fileConfig.rssCadence);

export const injectDirOption = new Option(
	"--inject-dir <dir>",
	"Directory of torrent files to try to inject",
).default(fileConfig.outputDir);

export const torrentsDevOption = new Option(
	"--torrents <torrents...>",
	"torrent files separated by spaces",
).hideHelp();

export function createCommandWithSharedOptions(
	name: string,
	description: string,
) {
	return program
		.command(name)
		.description(description)
		.addOption(torznabOption)
		.addOption(dataDirsOption)
		.addOption(matchModeOption)
		.addOption(linkCategoryOption)
		.addOption(linkDirOption)
		.addOption(flatLinkingOption)
		.addOption(linkTypeOption)
		.addOption(maxDataDepthOption)
		.addOption(torrentDirOption)
		.addOption(outputDirOption)
		.addOption(includeNonVideosOption)
		.addOption(noIncludeNonVideosOption)
		.addOption(includeSingleEpisodesOption)
		.addOption(fuzzySizeThresholdOption)
		.addOption(excludeOlderOption)
		.addOption(excludeRecentSearchOption)
		.addOption(noExcludeOlderOption)
		.addOption(noExcludeRecentSearchOption)
		.addOption(verboseOption)
		.addOption(actionOption)
		.addOption(rtorrentRpcUrlOption)
		.addOption(qbittorrentUrlOption)
		.addOption(transmissionRpcUrlOption)
		.addOption(delugeRpcUrlOption)
		.addOption(duplicateCategoriesOption)
		.addOption(notificationWebhookUrlOption)
		.addOption(delayOption)
		.addOption(snatchTimeoutOption)
		.addOption(searchTimeoutOption)
		.addOption(searchLimitOption)
		.addOption(blockListOption)
		.addOption(sonarrOption)
		.addOption(radarrOption);
}
