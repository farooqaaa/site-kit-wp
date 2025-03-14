/**
 * `modules/analytics` base data store
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
import Modules from 'googlesitekit-modules';
import { isFeatureEnabled } from '../../../features';
import { MODULES_ANALYTICS } from './constants';
import {
	rollbackChanges,
	submitChanges,
	validateCanSubmitChanges,
} from './settings';

const baseModuleStore = Modules.createModuleStore( 'analytics', {
	storeName: MODULES_ANALYTICS,
	settingSlugs: [
		'accountID',
		'adsConversionID',
		'anonymizeIP',
		'canUseSnippet',
		'internalWebPropertyID',
		'ownerID',
		'profileID',
		'propertyID',
		'trackingDisabled',
		'useSnippet',
	],
	adminPage: isFeatureEnabled( 'unifiedDashboard' )
		? undefined
		: 'googlesitekit-module-analytics',
	submitChanges,
	rollbackChanges,
	validateCanSubmitChanges,
} );

export default baseModuleStore;
