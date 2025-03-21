/**
 * Analytics Settings Edit component tests.
 *
 * Site Kit by Google, Copyright 2021 Google LLC
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
 * Internal dependencies
 */
import {
	render,
	waitFor,
	createTestRegistry,
} from '../../../../../../tests/js/test-utils';
import { CORE_MODULES } from '../../../../googlesitekit/modules/datastore/constants';
import { MODULES_ANALYTICS } from '../../datastore/constants';
import { MODULES_ANALYTICS_4 } from '../../../analytics-4/datastore/constants';
import SettingsEdit from './SettingsEdit';
import * as fixtures from '../../datastore/__fixtures__';
import {
	provideModules,
	provideSiteInfo,
} from '../../../../../../tests/js/utils';
import * as ga4Fixtures from '../../../analytics-4/datastore/__fixtures__';

describe( 'SettingsEdit', () => {
	let registry;

	beforeEach( () => {
		registry = createTestRegistry();
		provideSiteInfo( registry );
		provideModules( registry, [
			{
				slug: 'analytics',
				active: true,
				connected: true,
			},
		] );
	} );

	it( 'sets the account ID and property ID of an existing tag when present', async () => {
		fetchMock.get( /tagmanager\/data\/settings/, { body: {} } );
		fetchMock.getOnce(
			/^\/google-site-kit\/v1\/modules\/analytics-4\/data\/properties/,
			{ body: [] }
		);
		fetchMock.get(
			/^\/google-site-kit\/v1\/modules\/analytics-4\/data\/account-summaries/,
			{
				body: ga4Fixtures.accountSummaries,
				status: 200,
			}
		);
		fetchMock.get(
			/^\/google-site-kit\/v1\/modules\/analytics-4\/data\/webdatastreams-batch/,
			{
				body: ga4Fixtures.webDataStreamsBatch,
				status: 200,
			}
		);

		fetchMock.get( /\example.com/, {
			body: [],
			status: 200,
		} );

		const {
			accounts,
			properties,
			profiles,
		} = fixtures.accountsPropertiesProfiles;
		const existingTag = {
			/* eslint-disable sitekit/acronym-case */
			accountID: profiles[ 0 ].accountId,
			propertyID: profiles[ 0 ].webPropertyId,
			/* eslint-enable */
		};

		const { accountID, propertyID } = existingTag;

		registry.dispatch( CORE_MODULES ).receiveGetModules( [] );

		registry.dispatch( MODULES_ANALYTICS_4 ).setSettings( {} );

		registry.dispatch( MODULES_ANALYTICS ).setSettings( {} );
		registry.dispatch( MODULES_ANALYTICS ).receiveGetAccounts( accounts );
		registry
			.dispatch( MODULES_ANALYTICS )
			.receiveGetProperties( properties, { accountID } );
		registry
			.dispatch( MODULES_ANALYTICS )
			.receiveGetProfiles( profiles, { accountID, propertyID } );

		registry
			.dispatch( MODULES_ANALYTICS )
			.receiveGetExistingTag( existingTag.propertyID );
		registry.dispatch( MODULES_ANALYTICS ).receiveGetTagPermission(
			{
				accountID: existingTag.accountID,
				permission: true,
			},
			{ propertyID: existingTag.propertyID }
		);

		await waitFor( () => {
			render( <SettingsEdit />, { registry } );
		} );

		expect( registry.select( MODULES_ANALYTICS ).getAccountID() ).toBe(
			existingTag.accountID
		);
		expect( registry.select( MODULES_ANALYTICS ).getPropertyID() ).toBe(
			existingTag.propertyID
		);
		expect( registry.select( MODULES_ANALYTICS ).hasErrors() ).toBeFalsy();
	} );
} );
