/**
 * Internal dependencies
 */
import createDataLayerPush from './createDataLayerPush';
import { SCRIPT_IDENTIFIER, DATA_LAYER } from './constants';

/**
 * Returns a function which, when invoked enables tracking and injects the gtag script if necessary.
 *
 * @since 1.3.0
 *
 * @param {Object} config          Tracking configuration.
 * @param {Object} dataLayerTarget Data layer parent object.
 * @return {Function} Function that tracks an event.
 */
export default function createEnableTracking( config, dataLayerTarget ) {
	const dataLayerPush = createDataLayerPush( dataLayerTarget );

	let hasInsertedTag;

	/**
	 * Injects the necessary script tag if not present.
	 */
	const initializeSnippet = () => {
		const { document } = global;
		if ( undefined === hasInsertedTag ) {
			hasInsertedTag = document.querySelector(
				`script[${ SCRIPT_IDENTIFIER }]`
			);
		}
		if ( hasInsertedTag ) {
			return;
		}
		config.trackingEnabled = true;

		// If not present, inject it and initialize dataLayer.
		const scriptTag = document.createElement( 'script' );
		scriptTag.setAttribute( SCRIPT_IDENTIFIER, '' );
		scriptTag.async = true;
		scriptTag.src = `https://www.googletagmanager.com/gtag/js?id=${ config.trackingID }&l=${ DATA_LAYER }`;
		document.head.appendChild( scriptTag );

		dataLayerPush( 'js', new Date() );
		dataLayerPush( 'config', config.trackingID, {
			send_page_view: config.isSiteKitScreen,
		} );
		hasInsertedTag = true;
	};

	/**
	 * Enables tracking.
	 */
	function enableTracking() {
		initializeSnippet();
	}

	return {
		enableTracking,
		initializeSnippet,
	};
}
