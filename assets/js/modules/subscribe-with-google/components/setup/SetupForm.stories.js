/**
 * SetupFormGA4 component stories.
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
import { MODULES_SUBSCRIBE_WITH_GOOGLE } from '../../datastore/constants';
import {
	provideModules,
	provideModuleRegistrations,
	provideSiteInfo,
} from '../../../../../../tests/js/utils';
import ModuleSetup from '../../../../components/setup/ModuleSetup';
import WithRegistrySetup from '../../../../../../tests/js/WithRegistrySetup';

const features = [ 'swgModule' ];

function Template() {
	return <ModuleSetup moduleSlug="subscribe-with-google" />;
}

export const Default = Template.bind( null );
Default.storyName = 'Default';
Default.parameters = { features };

export default {
	title: 'Modules/Subscribe with Google/Setup/SetupForm',
	decorators: [
		( Story ) => {
			const setupRegistry = ( registry ) => {
				provideModules( registry, [
					{
						slug: 'subscribe-with-google',
						active: true,
						connected: false,
					},
				] );
				provideSiteInfo( registry );
				provideModuleRegistrations( registry );

				// Simulate a user filling out an initially empty form.
				registry
					.dispatch( MODULES_SUBSCRIBE_WITH_GOOGLE )
					.receiveGetSettings( {
						products: [],
						publicationID: '',
						revenueModel: '',
					} );
				registry
					.dispatch( MODULES_SUBSCRIBE_WITH_GOOGLE )
					.setProducts( [ 'basic' ] );
				registry
					.dispatch( MODULES_SUBSCRIBE_WITH_GOOGLE )
					.setPublicationID( 'example.com' );
				registry
					.dispatch( MODULES_SUBSCRIBE_WITH_GOOGLE )
					.setRevenueModel( 'contribution' );
			};

			return (
				<WithRegistrySetup func={ setupRegistry }>
					<Story />
				</WithRegistrySetup>
			);
		},
	],
};
