import Knex from "knex";

async function up(knex: Knex.Knex): Promise<void> {
	await knex.schema.alterTable("settings", (table) => {
		table.json("torznab");
		table.boolean("use_client_torrents");
		table.json("data_dirs");
		table.string("match_mode");
		table.boolean("skip_recheck");
		table.integer("auto_resume_max_download");
		table.string("link_category");
		table.json("link_dirs");
		table.boolean("flat_linking");
		table.string("link_type");
		table.integer("max_data_depth");
		table.string("torrent_dir");
		table.string("output_dir");
		table.boolean("include_non_videos");
		table.float("season_from_episodes");
		table.float("fuzzy_size_threshold");
		table.integer("exclude_older");
		table.integer("exclude_recent_search");
		table.string("action");
		table.string("rtorrent_rpc_url");
		table.string("qbittorrent_url");
		table.string("transmission_rpc_url");
		table.string("deluge_rpc_url");
		table.boolean("duplicate_categories");
		table.json("notification_webhook_urls");
		table.integer("delay");
		table.integer("snatch_timeout");
		table.integer("search_timeout");
		table.integer("search_limit");
		table.json("block_list");
		table.json("sonarr");
		table.json("radarr");
		table.integer("port");
		table.string("host");
		table.integer("search_cadence");
		table.integer("rss_cadence");
	});
}

async function down(knex: Knex.Knex): Promise<void> {
	await knex.schema.alterTable("settings", (table) => {
		table.dropColumn("torznab");
		table.dropColumn("use_client_torrents");
		table.dropColumn("data_dirs");
		table.dropColumn("match_mode");
		table.dropColumn("skip_recheck");
		table.dropColumn("auto_resume_max_download");
		table.dropColumn("link_category");
		table.dropColumn("link_dirs");
		table.dropColumn("flat_linking");
		table.dropColumn("link_type");
		table.dropColumn("max_data_depth");
		table.dropColumn("torrent_dir");
		table.dropColumn("output_dir");
		table.dropColumn("include_non_videos");
		table.dropColumn("season_from_episodes");
		table.dropColumn("fuzzy_size_threshold");
		table.dropColumn("exclude_older");
		table.dropColumn("exclude_recent_search");
		table.dropColumn("action");
		table.dropColumn("rtorrent_rpc_url");
		table.dropColumn("qbittorrent_url");
		table.dropColumn("transmission_rpc_url");
		table.dropColumn("deluge_rpc_url");
		table.dropColumn("duplicate_categories");
		table.dropColumn("notification_webhook_urls");
		table.dropColumn("delay");
		table.dropColumn("snatch_timeout");
		table.dropColumn("search_timeout");
		table.dropColumn("search_limit");
		table.dropColumn("block_list");
		table.dropColumn("sonarr");
		table.dropColumn("radarr");
		table.dropColumn("port");
		table.dropColumn("host");
		table.dropColumn("search_cadence");
		table.dropColumn("rss_cadence");
	});
}

export default { name: "04-auth", up, down };
