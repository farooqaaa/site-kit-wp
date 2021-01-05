<?php
/**
 * Plugin Name: E2E Feature Flag Endpoint
 * Description: REST Endpoint for setting or removing Feature Flag overrides during E2E tests.
 *
 * @package   Google\Site_Kit
 * @copyright 2021 Google LLC
 * @license   https://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://sitekit.withgoogle.com
 */

use Google\Site_Kit\Context;
use Google\Site_Kit\Core\REST_API\REST_Routes;
use Google\Site_Kit\Core\Util\Feature_Flags;

add_action(
	'rest_api_init',
	function () {
		if ( ! defined( 'GOOGLESITEKIT_PLUGIN_MAIN_FILE' ) ) {
			return;
		}

		register_rest_route(
			REST_Routes::REST_ROOT,
			'e2e/feature/set-flag',
			array(
				'methods'             => WP_REST_Server::EDITABLE,
				'callback'            => function ( WP_REST_Request $request ) {
					$feature_flag_overrides = get_option( 'googlesitekit_e2e_feature_flags', array() );

					if ( $request['feature_value'] ) {
						$feature_flag_overrides[ $request['feature_name'] ] = (bool) $request['feature_value'];
					} else {
						unset( $feature_flag_overrides[ $request['feature_name'] ] );
					}

					update_option( 'googlesitekit_e2e_feature_flags', $feature_flag_overrides );

					return array(
						'success' => true,
					);
				},
				'permission_callback' => '__return_true',
			)
		);
	},
	0
);

add_action(
	'plugins_loaded',
	function () {
		if ( ! defined( 'GOOGLESITEKIT_PLUGIN_MAIN_FILE' ) ) {
			return;
		}

		$feature_flag_overrides = get_option( 'googlesitekit_e2e_feature_flags', array() );

		// Apply any overrides set in the E2E options array.
		foreach ( $feature_flag_overrides as $name => $value ) {
			add_filter(
				'googlesitekit_is_feature_enabled',
				function( $feature_name, $feature_enabled, $mode ) {
					return $feature_name === $name ? $value : $feature_enabled;
				}
			);
		}
	}
);
