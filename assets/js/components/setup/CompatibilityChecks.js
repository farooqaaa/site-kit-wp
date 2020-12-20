/**
 * CompatibilityChecks component.
 *
 * Site Kit by Google, Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * WordPress dependencies
 */
import { Fragment } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import API from 'googlesitekit-api';
import { getExistingTag } from '../../util/tag';
import Warning from '../legacy-notifications/warning';
import ProgressBar from '../ProgressBar';
import { useChecks } from '../../hooks/useChecks';
import CompatibilityErrorNotice from './CompatibilityErrorNotice';

const ERROR_INVALID_HOSTNAME = 'invalid_hostname';
const ERROR_FETCH_FAIL = 'check_fetch_failed';
const ERROR_TOKEN_MISMATCH = 'setup_token_mismatch';
const ERROR_GOOGLE_API_CONNECTION_FAIL = 'google_api_connection_fail';
const ERROR_AMP_CDN_RESTRICTED = 'amp_cdn_restricted';
const ERROR_WP_PRE_V5 = 'wp_pre_v5';

export const AMP_PROJECT_TEST_URL = 'https://cdn.ampproject.org/v0.js';

const compatibilityChecks = [
	// Check for a known non-public/reserved domain.
	async () => {
		const { hostname } = global.location;

		if ( [ 'localhost', '127.0.0.1' ].includes( hostname ) || hostname.match( /\.(example|invalid|localhost|test)$/ ) ) {
			throw ERROR_INVALID_HOSTNAME;
		}
	},
	// Generate and check for a Site Kit specific meta tag on the page to test for aggressive caching.
	async () => {
		const { token } = await API.set( 'core', 'site', 'setup-tag' );

		const scrapedTag = await getExistingTag( 'setup' ).catch( () => {
			throw ERROR_FETCH_FAIL;
		} );

		if ( token !== scrapedTag ) {
			throw ERROR_TOKEN_MISMATCH;
		}
	},
	// Check that server can connect to Google's APIs via the core/site/data/health-checks endpoint.
	async () => {
		const response = await API.get( 'core', 'site', 'health-checks', undefined, {
			useCache: false,
		} ).catch( () => {
			throw ERROR_FETCH_FAIL;
		} );

		if ( ! response?.checks?.googleAPI?.pass ) {
			throw ERROR_GOOGLE_API_CONNECTION_FAIL;
		}
	},
	// Check that client can connect to AMP Project.
	async () => {
		const response = await fetch( AMP_PROJECT_TEST_URL ).catch( () => {
			throw ERROR_AMP_CDN_RESTRICTED;
		} );

		if ( ! response.ok ) {
			throw ERROR_AMP_CDN_RESTRICTED;
		}
	},
	// Check that the current version of WordPress is 5.0+.
	async () => {
		const { wpVersion } = global._googlesitekitBaseData || {};
		// Throw only if we can get the current version, otherwise ignore it.
		if ( wpVersion && wpVersion.major < 5 ) {
			throw ERROR_WP_PRE_V5;
		}
	},
];

export default function CompatibilityChecks( props ) {
	/*
	constructor( props ) {
		console.log( complete2 ); // eslint-disable-line no-console
		console.log( error2 ); // eslint-disable-line no-console
		const { isSiteKitConnected } = global._googlesitekitLegacyData.setup;
		super( props );
		this.state = {
			complete: isSiteKitConnected,
			error: null,
			developerPlugin: {},
		};
	}
	 */

	/*
	async componentDidMount() {
		if ( this.state.complete ) {
			return;
		}
		try {
			for ( const testCallback of compatibilityChecks ) {
				await testCallback();
			}
		} catch ( error ) {
			const developerPlugin = await API.get( 'core', 'site', 'developer-plugin' );
			this.setState( { error, developerPlugin } );
		}

		this.setState( { complete: true } );
	}
	*/
	const { complete, error } = useChecks( compatibilityChecks );
	let CTAFeedback;
	let inProgressFeedback;
	const { children, ...restProps } = props;

	if ( error ) {
		CTAFeedback = <Fragment>
			<div className="googlesitekit-setup-compat mdc-layout-grid mdc-layout-grid--align-left">
				<div className="googlesitekit-setup__warning">
					<Warning />

					<div className="googlesitekit-heading-4">
						{ __( 'Your site may not be ready for Site Kit', 'google-site-kit' ) }
					</div>
				</div>
				{ error && <CompatibilityErrorNotice error={ error } /> }
			</div>
		</Fragment>;
	}

	if ( ! complete ) {
		inProgressFeedback = <div style={ { alignSelf: 'center', marginLeft: '1rem' } }>
			<small>{ __( 'Checking Compatibility…', 'google-site-kit' ) }</small>
			<ProgressBar small compress />
		</div>;
	}

	return children( {
		restProps,
		complete,
		error,
		inProgressFeedback,
		CTAFeedback,
	} );
}
