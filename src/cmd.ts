#!/usr/bin/env node
import chalk from "chalk";
import { program } from "commander";
import { inspect } from "util";
import { getApiKey, resetApiKey } from "./auth.js";
import { customizeErrorMessage, VALIDATION_SCHEMA } from "./configSchema.js";
import { generateConfig } from "./configuration.js";
import { NEWLINE_INDENT, PROGRAM_NAME, PROGRAM_VERSION } from "./constants.js";
import { db } from "./db.js";
import { diffCmd } from "./diff.js";
import { CrossSeedError, exitOnCrossSeedErrors } from "./errors.js";
import { clearIndexerFailures } from "./indexers.js";
import { injectSavedTorrents } from "./inject.js";
import { jobsLoop } from "./jobs.js";
import { initializeLogger, Label, logger } from "./logger.js";
import {
	apiKeyOption,
	createCommandWithSharedOptions,
	hostOption,
	injectDirOption,
	noPortOption,
	notificationWebhookUrlOption,
	portOption,
	rssCadenceOption,
	searchCadenceOption,
	torrentsDevOption,
} from "./options.js";
import { runBulkSearch, scanRssFeeds } from "./pipeline.js";
import {
	initializePushNotifier,
	sendTestNotification,
} from "./pushNotifier.js";
import { RuntimeConfig, setRuntimeConfig } from "./runtimeConfig.js";
import { createSearcheeFromMetafile } from "./searchee.js";
import { serve } from "./server.js";
import "./signalHandlers.js";
import { doStartupValidation } from "./startup.js";
import { parseTorrentFromFilename } from "./torrent.js";

/**
 * validates and sets RuntimeConfig
 * @return (the number of errors Zod encountered in the configuration)
 */

export async function parseRuntimeConfig(
	options: unknown,
): Promise<RuntimeConfig> {
	logger.info(`${PROGRAM_NAME} v${PROGRAM_VERSION}`);
	logger.info("Validating your configuration...");
	try {
		return VALIDATION_SCHEMA.parse(options, {
			errorMap: customizeErrorMessage,
		}) as RuntimeConfig;
	} catch ({ errors }) {
		logger.verbose({
			label: Label.CONFIGDUMP,
			message: inspect(options),
		});
		errors?.forEach(({ path, message }) => {
			const urlPath = path[0];
			const optionLine =
				path.length === 2
					? `${path[0]} (position #${path[1] + 1})`
					: path;
			logger.error(
				`${
					path.length > 0 ? `Option: ${optionLine}` : "Configuration:"
				}${NEWLINE_INDENT}${message}${NEWLINE_INDENT}(https://www.cross-seed.org/docs/basics/options${
					urlPath ? `#${urlPath.toLowerCase()}` : ""
				})\n`,
			);
		});

		throw new CrossSeedError(
			`Your configuration is invalid, please see the ${
				errors.length > 1 ? "errors" : "error"
			} above for details.`,
		);
	}
}

function withCrossSeedRuntime(
	run: (options: RuntimeConfig) => Promise<void>,
	{ validateConfig = true } = {},
) {
	return async (options: Record<string, unknown>) => {
		try {
			initializeLogger(options);
			const runtimeConfig = validateConfig
				? await parseRuntimeConfig(options)
				: (options as unknown as RuntimeConfig);
			setRuntimeConfig(runtimeConfig);
			initializePushNotifier();
			await db.migrate.latest();
			if (validateConfig) await doStartupValidation();
			await run(runtimeConfig);
		} catch (e) {
			exitOnCrossSeedErrors(e);
		} finally {
			await db.destroy();
		}
	};
}

program.name(PROGRAM_NAME);
program.description(chalk.yellow.bold(`${PROGRAM_NAME} v${PROGRAM_VERSION}`));
program.version(PROGRAM_VERSION, "-V, --version", "output the current version");

program
	.command("gen-config")
	.description("Generate a config file")
	.option(
		"-d, --docker",
		"Generate the docker config instead of the normal one",
	)
	.action(generateConfig);

program
	.command("clear-cache")
	.description("Clear the cache of downloaded-and-rejected torrents")
	.action(
		withCrossSeedRuntime(async () => {
			await db("decision").whereNull("info_hash").del();
		}),
	);

program
	.command("clear-indexer-failures")
	.description("Clear the cached details of indexers (failures and caps)")
	.action(
		withCrossSeedRuntime(async () => {
			console.log(
				"If you've received a '429' (rate-limiting), continuing to hammer",
				"your indexers may result in negative consequences.",
			);
			console.log(
				"If you have to do this more than once in a short",
				"period of time, you have bigger issues that need to be addressed.",
			);
			await clearIndexerFailures();
		}),
	);
program
	.command("test-notification")
	.description("Send a test notification")
	.addOption(notificationWebhookUrlOption)
	.action(
		withCrossSeedRuntime(sendTestNotification, { validateConfig: false }),
	);

program
	.command("diff")
	.description("Analyze two torrent files for cross-seed compatibility")
	.argument("searchee")
	.argument("candidate")
	.action(diffCmd);

program
	.command("tree")
	.description("Print a torrent's file tree")
	.argument("torrent")
	.action(async (fn) => {
		const res = createSearcheeFromMetafile(
			await parseTorrentFromFilename(fn),
		);
		if (res.isOk()) {
			console.log(res.unwrap());
		} else {
			console.log(res.unwrapErr());
		}
	});

program
	.command("api-key")
	.description("Show the api key")
	.addOption(apiKeyOption)
	.action(
		withCrossSeedRuntime(async () => {
			console.log(await getApiKey());
		}),
	);

program
	.command("reset-api-key")
	.description("Reset the api key")
	.action(
		withCrossSeedRuntime(async () => {
			console.log(await resetApiKey());
		}),
	);

createCommandWithSharedOptions("daemon", "Start the cross-seed daemon")
	.addOption(portOption)
	.addOption(noPortOption)
	.addOption(hostOption)
	.addOption(searchCadenceOption)
	.addOption(rssCadenceOption)
	.addOption(apiKeyOption)
	.action(
		withCrossSeedRuntime(({ port, host }) => {
			serve(port, host);
			jobsLoop();
			// prevent db.destroy
			return new Promise(() => {});
		}),
	);

createCommandWithSharedOptions("rss", "Run an rss scan").action(
	withCrossSeedRuntime(scanRssFeeds),
);

createCommandWithSharedOptions("search", "Search for cross-seeds")
	.addOption(torrentsDevOption)
	.action(withCrossSeedRuntime(runBulkSearch));

createCommandWithSharedOptions(
	"inject",
	"Inject saved cross-seeds into your client (without filtering, see docs)",
)
	.addOption(injectDirOption)
	.action(withCrossSeedRuntime(injectSavedTorrents));

program.showHelpAfterError("(add --help for additional information)");

await program.parseAsync();
