/**
 * `core/modules` data store: modules tests.
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
import API from 'googlesitekit-api';
import {
	createTestRegistry,
	muteFetch,
	unsubscribeFromAll,
	untilResolved,
} from '../../../../../tests/js/utils';
import { sortByProperty } from '../../../util/sort-by-property';
import { convertArrayListToKeyedObjectMap } from '../../../util/convert-array-to-keyed-object-map';
import {
	CORE_MODULES,
	ERROR_CODE_INSUFFICIENT_MODULE_DEPENDENCIES,
} from './constants';
import FIXTURES, { withActive } from './__fixtures__';

describe( 'core/modules modules', () => {
	const dashboardSharingDataBaseVar = '_googlesitekitDashboardSharingData';
	const recoverableModuleList = {
		recoverableModules: [ 'analytics', 'search-console', 'tagmanager' ],
	};

	const sortedFixtures = sortByProperty( FIXTURES, 'order' );
	const fixturesKeyValue = convertArrayListToKeyedObjectMap(
		sortedFixtures,
		'slug'
	);

	const getModulesBySlugList = ( slugList, modules ) => {
		return Object.values( modules ).reduce(
			( recoverableModules, module ) => {
				if ( slugList.includes( module.slug ) ) {
					return {
						...recoverableModules,
						[ module.slug ]: module,
					};
				}

				return recoverableModules;
			},
			{}
		);
	};

	let registry;
	let store;

	beforeEach( async () => {
		// Invalidate the cache before every request, but keep it enabled to
		// make sure we're opting-out of the cache for the correct requests.
		await API.invalidateCache();

		registry = createTestRegistry();
		store = registry.stores[ CORE_MODULES ].store;
	} );

	afterEach( () => {
		unsubscribeFromAll( registry );
		delete global[ dashboardSharingDataBaseVar ];
	} );

	describe( 'actions', () => {
		describe( 'activateModule', () => {
			it( 'dispatches a request to activate this module', async () => {
				// In our fixtures, optimize is off by default.
				const slug = 'optimize';
				fetchMock.getOnce(
					/^\/google-site-kit\/v1\/core\/modules\/data\/list/,
					{ body: FIXTURES }
				);

				// Call a selector that triggers an HTTP request to get the modules.
				registry.select( CORE_MODULES ).isModuleActive( slug );
				// Wait until the modules have been loaded.
				await untilResolved( registry, CORE_MODULES ).getModules();
				const isActiveBefore = registry
					.select( CORE_MODULES )
					.isModuleActive( slug );

				expect( isActiveBefore ).toEqual( false );

				// Activate the module.
				fetchMock.postOnce(
					/^\/google-site-kit\/v1\/core\/modules\/data\/activation/,
					{ body: { success: true } }
				);
				fetchMock.getOnce(
					/^\/google-site-kit\/v1\/core\/user\/data\/authentication/,
					{ body: {} }
				);

				await registry.dispatch( CORE_MODULES ).activateModule( slug );

				// Ensure the proper body parameters were sent.
				expect( fetchMock ).toHaveFetched(
					/^\/google-site-kit\/v1\/core\/modules\/data\/activation/,
					{
						body: {
							data: {
								slug,
								active: true,
							},
						},
					}
				);

				// Optimize should stay inactive.
				const isActiveAfter = registry
					.select( CORE_MODULES )
					.isModuleActive( slug );

				expect( fetchMock ).toHaveFetchedTimes( 3 );
				expect( isActiveAfter ).toBe( false );
			} );

			it( 'does not update status if the API encountered a failure', async () => {
				// In our fixtures, optimize is off by default.
				const slug = 'optimize';
				registry.dispatch( CORE_MODULES ).receiveGetModules( FIXTURES );

				const isActiveBefore = registry
					.select( CORE_MODULES )
					.isModuleActive( slug );

				expect( isActiveBefore ).toEqual( false );

				// Try to activate the module—this will fail.
				const response = {
					code: 'internal_server_error',
					message: 'Internal server error',
					data: { status: 500 },
				};

				fetchMock.postOnce(
					/^\/google-site-kit\/v1\/core\/modules\/data\/activation/,
					{ body: response, status: 500 }
				);

				await registry.dispatch( CORE_MODULES ).activateModule( slug );

				// Ensure the proper body parameters were sent.
				expect( fetchMock ).toHaveFetched(
					/^\/google-site-kit\/v1\/core\/modules\/data\/activation/,
					{
						body: {
							data: {
								slug,
								active: true,
							},
						},
					}
				);

				// Optimize should be active.
				const isActiveAfter = registry
					.select( CORE_MODULES )
					.isModuleActive( slug );

				// The fourth request to update the modules shouldn't be called, because the
				// activation request failed.
				expect( fetchMock ).toHaveBeenCalledTimes( 1 );
				expect( isActiveAfter ).toEqual( false );
				expect( console ).toHaveErrored();
			} );
		} );

		describe( 'recoverModule', () => {
			it( 'dispatches a request to recover a module', async () => {
				const slug = 'analytics';
				fetchMock.get(
					/^\/google-site-kit\/v1\/core\/modules\/data\/list/,
					{
						body: [
							...FIXTURES,
							{
								slug: 'analytics',
								name: 'Analytics',
								active: true,
								connected: true,
								shareable: true,
								storeName: 'modules/analytics',
							},
						],
						status: 200,
					}
				);
				fetchMock.postOnce(
					/^\/google-site-kit\/v1\/core\/modules\/data\/recover-module/,
					{ body: { ownerID: 1 } }
				);

				fetchMock.getOnce(
					/^\/google-site-kit\/v1\/modules\/analytics\/data\/settings/,
					{
						body: getModulesBySlugList( [ slug ], FIXTURES ),
						status: 200,
					}
				);

				const initialModules = registry
					.select( CORE_MODULES )
					.getModules();
				// The modules info will be its initial value while the modules
				// info is fetched.
				expect( initialModules ).toBeUndefined();
				await untilResolved( registry, CORE_MODULES ).getModules();

				const { response } = await registry
					.dispatch( CORE_MODULES )
					.recoverModule( slug );

				expect( response.success ).toBe( true );

				expect( fetchMock ).toHaveFetchedTimes( 4 );

				// Ensure the proper body parameters were sent.
				expect( fetchMock ).toHaveFetched(
					/^\/google-site-kit\/v1\/core\/modules\/data\/recover-module/,
					{
						body: {
							data: {
								slug,
							},
						},
					}
				);

				// Ensure fetchGetSettings have been called.
				expect( fetchMock ).toHaveFetched(
					/^\/google-site-kit\/v1\/modules\/analytics\/data\/settings/,
					{
						body: {
							data: {
								slug,
							},
						},
					}
				);

				// Ensure fetchGetModules have been called.
				expect( fetchMock ).toHaveFetched(
					/^\/google-site-kit\/v1\/core\/modules\/data\/list/
				);
			} );

			it( 'encounters an error if the module is not recoverable', async () => {
				const slug = 'analytics';
				fetchMock.get(
					/^\/google-site-kit\/v1\/core\/modules\/data\/list/,
					{ body: FIXTURES, status: 200 }
				);

				const errorResponse = {
					code: 'module_not_recoverable',
					message: 'Module is not recoverable.',
					data: { status: 403 },
				};
				fetchMock.postOnce(
					/^\/google-site-kit\/v1\/core\/modules\/data\/recover-module/,
					{ body: errorResponse, status: 403 }
				);

				const initialModules = registry
					.select( CORE_MODULES )
					.getModules();
				// The modules info will be its initial value while the modules
				// info is fetched.
				expect( initialModules ).toBeUndefined();
				await untilResolved( registry, CORE_MODULES ).getModules();

				const { response, error } = await registry
					.dispatch( CORE_MODULES )
					.recoverModule( slug );

				expect( console ).toHaveErrored();
				expect( response.success ).toBe( false );
				expect( error.message ).toBe( errorResponse.message );

				expect( fetchMock ).toHaveFetchedTimes( 2 );

				// Ensure the proper body parameters were sent.
				expect( fetchMock ).toHaveFetched(
					/^\/google-site-kit\/v1\/core\/modules\/data\/recover-module/,
					{
						body: {
							data: {
								slug,
							},
						},
					}
				);

				// Ensure fetchGetSettings haven't been called.
				expect( fetchMock ).not.toHaveFetched(
					/^\/google-site-kit\/v1\/modules\/analytics\/data\/settings/,
					{
						body: {
							data: {
								slug,
							},
						},
					}
				);
			} );

			it( 'encounters an error if an invalid module slug is passed', async () => {
				const slug = 'invalid-slug';
				fetchMock.get(
					/^\/google-site-kit\/v1\/core\/modules\/data\/list/,
					{ body: FIXTURES, status: 200 }
				);

				const errorResponse = {
					code: 'invalid_module_slug',
					message: `Invalid module slug ${ slug }.`,
					data: { status: 404 },
				};
				fetchMock.postOnce(
					/^\/google-site-kit\/v1\/core\/modules\/data\/recover-module/,
					{ body: errorResponse, status: 403 }
				);

				const initialModules = registry
					.select( CORE_MODULES )
					.getModules();
				// The modules info will be its initial value while the modules
				// info is fetched.
				expect( initialModules ).toBeUndefined();
				await untilResolved( registry, CORE_MODULES ).getModules();

				const { response, error } = await registry
					.dispatch( CORE_MODULES )
					.recoverModule( slug );

				expect( console ).toHaveErrored();
				expect( response.success ).toBe( false );
				expect( error.message ).toBe( errorResponse.message );

				expect( fetchMock ).toHaveFetchedTimes( 2 );

				// Ensure the proper body parameters were sent.
				expect( fetchMock ).toHaveFetched(
					/^\/google-site-kit\/v1\/core\/modules\/data\/recover-module/,
					{
						body: {
							data: {
								slug,
							},
						},
					}
				);

				// Ensure fetchGetSettings haven't been called.
				expect( fetchMock ).not.toHaveFetched(
					/^\/google-site-kit\/v1\/modules\/analytics\/data\/settings/,
					{
						body: {
							data: {
								slug,
							},
						},
					}
				);
			} );
		} );

		describe( 'deactivateModule', () => {
			it( 'dispatches a request to deactivate this module', async () => {
				// In our fixtures, analytics is off by default.
				const slug = 'analytics';
				registry
					.dispatch( CORE_MODULES )
					.receiveGetModules( withActive( slug ) );

				const isActiveBefore = registry
					.select( CORE_MODULES )
					.isModuleActive( slug );
				expect( isActiveBefore ).toEqual( true );

				fetchMock.postOnce(
					/^\/google-site-kit\/v1\/core\/modules\/data\/activation/,
					{ body: { success: true }, status: 200 }
				);

				fetchMock.getOnce(
					/^\/google-site-kit\/v1\/core\/user\/data\/authentication/,
					{ body: {}, status: 200 }
				);

				await registry
					.dispatch( CORE_MODULES )
					.deactivateModule( slug );

				// Ensure the proper body parameters were sent.
				expect( fetchMock ).toHaveFetched(
					/^\/google-site-kit\/v1\/core\/modules\/data\/activation/,
					{
						body: {
							data: {
								slug,
								active: false,
							},
						},
					}
				);

				// Analytics should stay active.
				const isActiveAfter = registry
					.select( CORE_MODULES )
					.isModuleActive( slug );
				expect( isActiveAfter ).toBe( true );
				expect( fetchMock ).toHaveFetchedTimes( 2 );
			} );

			it( 'does not update status if the API encountered a failure', async () => {
				// In our fixtures, analytics is off by default.
				const slug = 'analytics';
				registry
					.dispatch( CORE_MODULES )
					.receiveGetModules( withActive( slug ) );

				const isActiveBefore = registry
					.select( CORE_MODULES )
					.isModuleActive( slug );
				expect( isActiveBefore ).toEqual( true );

				// Try to deactivate the module—this will fail.
				const response = {
					code: 'internal_server_error',
					message: 'Internal server error',
					data: { status: 500 },
				};

				fetchMock.postOnce(
					/^\/google-site-kit\/v1\/core\/modules\/data\/activation/,
					{ body: response, status: 500 }
				);

				await registry
					.dispatch( CORE_MODULES )
					.deactivateModule( slug );

				// Ensure the proper body parameters were sent.
				expect( fetchMock ).toHaveFetched(
					/^\/google-site-kit\/v1\/core\/modules\/data\/activation/,
					{
						body: {
							data: {
								slug,
								active: false,
							},
						},
					}
				);

				// Analytics should still be active.
				const isActiveAfter = registry
					.select( CORE_MODULES )
					.isModuleActive( slug );

				// The fourth request to update the modules shouldn't be called, because the
				// deactivation request failed.
				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( isActiveAfter ).toEqual( true );
				expect( console ).toHaveErrored();
			} );
		} );

		describe( 'registerModule', () => {
			const moduleSlug = 'test-module';
			const moduleSettings = {
				name: 'Test Module',
				order: 1,
				description: 'A module for testing',
				homepage: 'https://sitekit.withgoogle.com/',
			};

			beforeEach( () => {
				registry.dispatch( CORE_MODULES ).receiveGetModules( [] );
			} );

			it( 'registers a module', () => {
				registry
					.dispatch( CORE_MODULES )
					.registerModule( moduleSlug, moduleSettings );
				const modules = registry.select( CORE_MODULES ).getModules();
				expect( modules[ moduleSlug ] ).not.toBeUndefined();
				expect( modules[ moduleSlug ] ).toMatchObject( moduleSettings );
			} );

			it( 'does not allow active or connected properties to be set to true', () => {
				registry.dispatch( CORE_MODULES ).receiveGetModules( FIXTURES );
				registry.dispatch( CORE_MODULES ).registerModule( moduleSlug, {
					active: true,
					connected: true,
					...moduleSettings,
				} );
				const modules = registry.select( CORE_MODULES ).getModules();
				expect( modules[ moduleSlug ] ).toMatchObject( {
					active: false,
					connected: false,
				} );
			} );

			it( 'does not allow the same module to be registered more than once on the client', () => {
				registry.dispatch( CORE_MODULES ).receiveGetModules( [] );

				registry
					.dispatch( CORE_MODULES )
					.registerModule( 'test-module', { name: 'Original Name' } );

				expect( console ).not.toHaveWarned();

				registry
					.dispatch( CORE_MODULES )
					.registerModule( 'test-module', { name: 'New Name' } );

				expect(
					store.getState().clientDefinitions[ 'test-module' ].name
				).toBe( 'Original Name' );
				expect( console ).toHaveWarned();
			} );

			it( 'accepts settings components for the module', () => {
				const SettingsViewComponent = () => 'view';
				const SettingsEditComponent = () => 'edit';

				registry.dispatch( CORE_MODULES ).registerModule( moduleSlug, {
					SettingsViewComponent,
					SettingsEditComponent,
				} );

				expect(
					store.getState().clientDefinitions[ moduleSlug ]
						.SettingsViewComponent
				).toEqual( SettingsViewComponent );
				expect(
					store.getState().clientDefinitions[ moduleSlug ]
						.SettingsEditComponent
				).toEqual( SettingsEditComponent );
			} );
		} );

		describe( 'fetchGetModules', () => {
			it( 'does not require any params', () => {
				expect( () => {
					muteFetch(
						/^\/google-site-kit\/v1\/core\/modules\/data\/list/,
						[]
					);
					registry.dispatch( CORE_MODULES ).fetchGetModules();
				} ).not.toThrow();
			} );
		} );

		describe( 'receiveGetModules', () => {
			it( 'requires the response param', () => {
				expect( () => {
					registry.dispatch( CORE_MODULES ).receiveGetModules();
				} ).toThrow( 'response is required.' );
			} );

			it( 'receives and sets server definitions', () => {
				const modules = FIXTURES;
				registry.dispatch( CORE_MODULES ).receiveGetModules( modules );

				const state = store.getState();

				expect( state.serverDefinitions ).toMatchObject(
					fixturesKeyValue
				);
			} );
		} );

		describe( 'receiveCheckRequirementsError', () => {
			it( 'requires the error and slug params', () => {
				expect( () => {
					registry
						.dispatch( CORE_MODULES )
						.receiveCheckRequirementsError();
				} ).toThrow( 'slug is required' );
				expect( () => {
					registry
						.dispatch( CORE_MODULES )
						.receiveCheckRequirementsError( 'slug' );
				} ).toThrow( 'error is required' );
			} );

			it( 'receives and sets the error', () => {
				const slug = 'slug1';
				const error = {
					code: 'error_code',
					message: 'Error Message',
					data: null,
				};
				const state = { ...store.getState().checkRequirementsResults };
				registry
					.dispatch( CORE_MODULES )
					.receiveCheckRequirementsError( slug, error );
				expect(
					store.getState().checkRequirementsResults
				).toMatchObject( { ...state, [ slug ]: error } );
			} );
		} );

		describe( 'receiveCheckRequirementsSuccess', () => {
			it( 'requires the slug param', () => {
				expect( () => {
					registry
						.dispatch( CORE_MODULES )
						.receiveCheckRequirementsSuccess();
				} ).toThrow( 'slug is required' );
			} );

			it( 'receives and sets success', () => {
				const slug = 'test-module';
				const state = { ...store.getState().checkRequirementsResults };
				registry
					.dispatch( CORE_MODULES )
					.receiveCheckRequirementsSuccess( slug );
				expect(
					store.getState().checkRequirementsResults
				).toMatchObject( { ...state, [ slug ]: true } );
			} );
		} );

		describe( 'receiveCheckModuleAccess', () => {
			it( 'requires the response param', () => {
				expect( () => {
					registry
						.dispatch( CORE_MODULES )
						.receiveCheckModuleAccess();
				} ).toThrow( 'response is required.' );
			} );

			it( 'requires the `params` param', () => {
				expect( () => {
					registry
						.dispatch( CORE_MODULES )
						.receiveCheckModuleAccess( { access: true } );
				} ).toThrow( 'params is required.' );
			} );

			it( 'receives and sets module access state', () => {
				registry
					.dispatch( CORE_MODULES )
					.receiveCheckModuleAccess(
						{ access: true },
						{ slug: 'search-console' }
					);

				const state = store.getState();

				expect( state.moduleAccess ).toMatchObject( {
					'search-console': true,
				} );
			} );
		} );
	} );

	describe( 'selectors', () => {
		// We need a module set where one dependency is active, and the other inactive.
		const bootStrapActivateModulesTests = async () => {
			const moduleFixtures = [
				{
					slug: 'slug1',
					active: true,
					dependencies: [],
					dependants: [ 'slug1dependant' ],
				},
				{
					slug: 'slug2',
					active: false,
					dependencies: [],
					dependants: [ 'slug2dependant' ],
				},
				{
					slug: 'slug1dependant',
					active: false,
					dependencies: [ 'slug1' ],
					dependants: [],
				},
				{
					slug: 'slug2dependant',
					active: false,
					dependencies: [ 'slug2' ],
					dependants: [],
				},
			];

			fetchMock.getOnce(
				/^\/google-site-kit\/v1\/core\/modules\/data\/list/,
				{ body: moduleFixtures, status: 200 }
			);
			const slug1 = 'slug1';
			const slug2 = 'slug2';
			const slug1Dependant = 'slug1dependant';
			const slug2Dependant = 'slug2dependant';
			registry.dispatch( CORE_MODULES ).registerModule( slug1 );
			registry.dispatch( CORE_MODULES ).registerModule( slug2 );
			registry.dispatch( CORE_MODULES ).registerModule( slug1Dependant );
			registry.dispatch( CORE_MODULES ).registerModule( slug2Dependant );

			registry.select( CORE_MODULES ).getModule( slug1 );

			// Wait for loading to complete.
			await untilResolved( registry, CORE_MODULES ).getModules();
		};

		describe( 'getModules', () => {
			it( 'uses a resolver to make a network request', async () => {
				fetchMock.getOnce(
					/^\/google-site-kit\/v1\/core\/modules\/data\/list/,
					{ body: FIXTURES, status: 200 }
				);

				const initialModules = registry
					.select( CORE_MODULES )
					.getModules();
				// The modules info will be its initial value while the modules
				// info is fetched.
				expect( initialModules ).toBeUndefined();
				await untilResolved( registry, CORE_MODULES ).getModules();

				const modules = registry.select( CORE_MODULES ).getModules();

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( modules ).toMatchObject( fixturesKeyValue );
			} );

			it( 'does not make a network request if data is already in state', async () => {
				registry.dispatch( CORE_MODULES ).receiveGetModules( FIXTURES );

				const modules = registry.select( CORE_MODULES ).getModules();

				await untilResolved( registry, CORE_MODULES ).getModules();

				expect( fetchMock ).not.toHaveFetched();
				expect( modules ).toMatchObject( fixturesKeyValue );
			} );

			it( 'dispatches an error if the request fails', async () => {
				const response = {
					code: 'internal_server_error',
					message: 'Internal server error',
					data: { status: 500 },
				};
				fetchMock.getOnce(
					/^\/google-site-kit\/v1\/core\/modules\/data\/list/,
					{ body: response, status: 500 }
				);

				registry.select( CORE_MODULES ).getModules();

				await untilResolved( registry, CORE_MODULES ).getModules();

				expect( console ).toHaveErrored();

				const modules = registry.select( CORE_MODULES ).getModules();

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( modules ).toBeUndefined();
			} );

			it( 'combines `serverDefinitions` with `clientDefinitions`', () => {
				registry
					.dispatch( CORE_MODULES )
					.receiveGetModules( [ { slug: 'server-module' } ] );
				registry
					.dispatch( CORE_MODULES )
					.registerModule( 'client-module' );

				const modules = registry.select( CORE_MODULES ).getModules();

				expect( Object.keys( modules ) ).toEqual(
					expect.arrayContaining( [
						'server-module',
						'client-module',
					] )
				);
			} );

			it( 'merges `serverDefinitions` of the same module with `clientDefinitions`', () => {
				registry
					.dispatch( CORE_MODULES )
					.receiveGetModules( [
						{ slug: 'test-module', name: 'Server Name' },
					] );
				registry
					.dispatch( CORE_MODULES )
					.registerModule( 'test-module', { name: 'Client Name' } );

				const modules = registry.select( CORE_MODULES ).getModules();

				expect( modules[ 'test-module' ] ).toMatchObject( {
					name: 'Client Name',
				} );
			} );

			it( 'does not overwrite `serverDefinitions` of the same module with undefined settings from client registration', () => {
				registry.dispatch( CORE_MODULES ).receiveGetModules( [
					{
						slug: 'test-module',
						name: 'Server Name',
						description: 'Server description',
					},
				] );
				registry
					.dispatch( CORE_MODULES )
					.registerModule( 'test-module', {
						description: 'Client description',
					} );

				const modules = registry.select( CORE_MODULES ).getModules();

				expect( modules[ 'test-module' ] ).toMatchObject( {
					name: 'Server Name',
					description: 'Client description',
				} );
			} );

			it( 'returns an object with keys set in module order', () => {
				registry.dispatch( CORE_MODULES ).receiveGetModules( [] );
				registry
					.dispatch( CORE_MODULES )
					.registerModule( 'second-module', { order: 2 } );
				registry
					.dispatch( CORE_MODULES )
					.registerModule( 'first-module', { order: 1 } );
				registry
					.dispatch( CORE_MODULES )
					.registerModule( 'third-module', { order: 3 } );

				const modules = registry.select( CORE_MODULES ).getModules();

				expect( Object.keys( modules ) ).toEqual( [
					'first-module',
					'second-module',
					'third-module',
				] );
			} );

			it( 'defaults settings components to `null` if not provided', () => {
				registry.dispatch( CORE_MODULES ).receiveGetModules( [] );
				registry
					.dispatch( CORE_MODULES )
					.registerModule( 'test-module' );

				const module = registry
					.select( CORE_MODULES )
					.getModule( 'test-module' );

				expect( module.SettingsViewComponent ).toEqual( null );
				expect( module.SettingsEditComponent ).toEqual( null );
			} );
		} );

		describe( 'getModule', () => {
			it( 'uses a resolver get all modules when one is requested', async () => {
				fetchMock.getOnce(
					/^\/google-site-kit\/v1\/core\/modules\/data\/list/,
					{ body: FIXTURES, status: 200 }
				);
				const slug = 'analytics';
				const module = registry
					.select( CORE_MODULES )
					.getModule( slug );

				// The modules will be undefined whilst loading.
				expect( module ).toBeUndefined();

				// Wait for loading to complete.
				await untilResolved( registry, CORE_MODULES ).getModules();

				const moduleLoaded = registry
					.select( CORE_MODULES )
					.getModule( slug );

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( moduleLoaded ).toMatchObject(
					fixturesKeyValue[ slug ]
				);
			} );

			it( 'dispatches an error if the request fails', async () => {
				const response = {
					code: 'internal_server_error',
					message: 'Internal server error',
					data: { status: 500 },
				};
				const slug = 'analytics';

				fetchMock.getOnce(
					/^\/google-site-kit\/v1\/core\/modules\/data\/list/,
					{ body: response, status: 500 }
				);

				registry.select( CORE_MODULES ).getModule( slug );

				await untilResolved( registry, CORE_MODULES ).getModules();

				const module = registry
					.select( CORE_MODULES )
					.getModule( slug );

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( module ).toEqual( undefined );
				expect( console ).toHaveErrored();
			} );

			it( 'returns undefined if modules is not yet available', async () => {
				// This triggers a network request, so ignore the error.
				muteFetch(
					/^\/google-site-kit\/v1\/core\/modules\/data\/list/,
					[]
				);

				const module = registry
					.select( CORE_MODULES )
					.getModule( 'analytics' );

				expect( module ).toBeUndefined();
			} );

			it( 'returns null if the module does not exist', async () => {
				fetchMock.getOnce(
					/^\/google-site-kit\/v1\/core\/modules\/data\/list/,
					{ body: FIXTURES, status: 200 }
				);

				const slug = 'analytics';
				const module = registry
					.select( CORE_MODULES )
					.getModule( slug );
				// The modules will be undefined whilst loading.
				expect( module ).toBeUndefined();

				// Wait for loading to complete.
				await untilResolved( registry, CORE_MODULES ).getModules();

				const moduleLoaded = registry
					.select( CORE_MODULES )
					.getModule( 'not-a-real-module' );

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( moduleLoaded ).toEqual( null );
			} );
		} );

		describe( 'canActivateModule', () => {
			it.each( [
				[ 'active', 'slug1dependant', true ],
				[ 'inactive', 'slug2dependant', false ],
			] )(
				'checks that we can activate modules with an %s dependency',
				async ( _, slug, expected ) => {
					await bootStrapActivateModulesTests();

					registry.select( CORE_MODULES ).canActivateModule( slug );
					await untilResolved(
						registry,
						CORE_MODULES
					).canActivateModule( slug );

					const canActivate = registry
						.select( CORE_MODULES )
						.canActivateModule( slug );
					expect( canActivate ).toEqual( expected );
				}
			);
		} );

		describe( 'getCheckRequirementsError', () => {
			it( 'has no error message when we can activate a module', async () => {
				await bootStrapActivateModulesTests();
				const slug = 'slug1dependant';
				registry.select( CORE_MODULES ).canActivateModule( slug );
				await untilResolved( registry, CORE_MODULES ).canActivateModule(
					slug
				);

				const error = registry
					.select( CORE_MODULES )
					.getCheckRequirementsError( slug );
				expect( error ).toEqual( null );
			} );

			it( 'has an error when we can not activate a module', async () => {
				await bootStrapActivateModulesTests();
				const slug = 'slug2dependant';
				registry.select( CORE_MODULES ).canActivateModule( slug );
				await untilResolved( registry, CORE_MODULES ).canActivateModule(
					slug
				);

				const error = registry
					.select( CORE_MODULES )
					.getCheckRequirementsError( slug );
				expect( error ).toEqual( {
					code: ERROR_CODE_INSUFFICIENT_MODULE_DEPENDENCIES,
					data: {
						inactiveModules: [ 'slug2' ],
					},
					message:
						'You need to set up slug2 to gain access to slug2dependant.',
				} );
			} );
		} );

		describe.each( [
			[ 'getModuleDependencyNames', 'dependencies' ],
			[ 'getModuleDependantNames', 'dependants' ],
		] )( '%s', ( selector, collectionName ) => {
			it( 'returns undefined when no modules are loaded', async () => {
				fetchMock.getOnce(
					/^\/google-site-kit\/v1\/core\/modules\/data\/list/,
					{ body: FIXTURES, status: 200 }
				);
				const slug = 'optimize';
				const namesLoaded = registry
					.select( CORE_MODULES )
					[ selector ]( slug );

				// The modules will be undefined whilst loading.
				expect( namesLoaded ).toBeUndefined();
			} );

			it( `returns ${ collectionName } module names when modules are loaded`, async () => {
				fetchMock.getOnce(
					/^\/google-site-kit\/v1\/core\/modules\/data\/list/,
					{ body: FIXTURES, status: 200 }
				);
				const slug = 'optimize';
				registry.select( CORE_MODULES )[ selector ]( slug );

				// Wait for loading to complete.
				await untilResolved( registry, CORE_MODULES ).getModules();

				const namesLoaded = registry
					.select( CORE_MODULES )
					[ selector ]( slug );

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( namesLoaded ).toMatchObject(
					fixturesKeyValue[ slug ][ collectionName ].map(
						( key ) => fixturesKeyValue[ key ].name
					)
				);
			} );

			it( `returns an empty array when requesting ${ collectionName } for a non-existent module`, async () => {
				fetchMock.getOnce(
					/^\/google-site-kit\/v1\/core\/modules\/data\/list/,
					{ body: FIXTURES, status: 200 }
				);
				const slug = 'non-existent-slug';
				registry.select( CORE_MODULES )[ selector ]( slug );

				// Wait for loading to complete.
				await untilResolved( registry, CORE_MODULES ).getModules();

				const namesLoaded = registry
					.select( CORE_MODULES )
					[ selector ]( slug );

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( namesLoaded ).toMatchObject( {} );
			} );
		} );

		describe( 'isModuleActive', () => {
			beforeEach( () => {
				fetchMock.getOnce(
					/^\/google-site-kit\/v1\/core\/modules\/data\/list/,
					{ body: FIXTURES, status: 200 }
				);
			} );

			it( 'returns true if a module is active', async () => {
				// Search console is active in our fixtures.
				const slug = 'search-console';
				const isActive = registry
					.select( CORE_MODULES )
					.isModuleActive( slug );
				// The modules will be undefined whilst loading, so this will return `undefined`.
				expect( isActive ).toBeUndefined();

				// Wait for loading to complete.
				await untilResolved( registry, CORE_MODULES ).getModules();

				const isActiveLoaded = registry
					.select( CORE_MODULES )
					.isModuleActive( slug );
				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( isActiveLoaded ).toEqual( true );
			} );

			it( 'returns false if a module is not active', async () => {
				// Optimize in our fixtures is not active.
				const slug = 'optimize';
				const isActive = registry
					.select( CORE_MODULES )
					.isModuleActive( slug );
				// The modules will be undefined whilst loading, so this will return `undefined`.
				expect( isActive ).toBeUndefined();

				// Wait for loading to complete.
				await untilResolved( registry, CORE_MODULES ).getModules();

				const isActiveLoaded = registry
					.select( CORE_MODULES )
					.isModuleActive( slug );

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( isActiveLoaded ).toEqual( false );
			} );

			it( 'returns null if a module does not exist', async () => {
				const slug = 'not-a-real-module';
				const isActive = registry
					.select( CORE_MODULES )
					.isModuleActive( slug );
				// The modules will be undefined whilst loading, so this will return `undefined`.
				expect( isActive ).toBeUndefined();

				// Wait for loading to complete.
				await untilResolved( registry, CORE_MODULES ).getModules();

				const isActiveLoaded = registry
					.select( CORE_MODULES )
					.isModuleActive( slug );

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( isActiveLoaded ).toEqual( null );
			} );

			it( 'returns undefined if modules is not yet available', async () => {
				muteFetch(
					/^\/google-site-kit\/v1\/core\/modules\/data\/list/,
					[]
				);

				const isActive = registry
					.select( CORE_MODULES )
					.isModuleActive( 'analytics' );

				expect( isActive ).toBeUndefined();
			} );
		} );

		describe( 'isModuleConnected', () => {
			it.each( [
				[
					'true if a module is connected',
					'analytics',
					true,
					{ connected: true },
				],
				[
					'false if a module is not active',
					'optimize',
					false,
					{ active: false },
				],
				[
					'false if a module is active but not connected',
					'adsense',
					false,
				],
				[
					'null if a module does not exist',
					'not-a-real-module',
					null,
				],
			] )(
				'should return %s',
				async ( _, slug, expected, extraData = {} ) => {
					fetchMock.getOnce(
						/^\/google-site-kit\/v1\/core\/modules\/data\/list/,
						{
							status: 200,
							body: withActive( slug ).map( ( module ) =>
								module.slug === slug
									? { ...module, ...extraData }
									: module
							),
						}
					);

					// The modules will be undefined whilst loading, so this will
					// return `undefined`.
					const isConnected = registry
						.select( CORE_MODULES )
						.isModuleConnected( slug );
					expect( isConnected ).toBeUndefined();

					// Wait for loading to complete.
					await untilResolved( registry, CORE_MODULES ).getModules();

					const isConnectedLoaded = registry
						.select( CORE_MODULES )
						.isModuleConnected( slug );
					expect( fetchMock ).toHaveFetchedTimes( 1 );
					expect( isConnectedLoaded ).toEqual( expected );
				}
			);

			it( 'returns undefined if modules is not yet available', async () => {
				muteFetch(
					/^\/google-site-kit\/v1\/core\/modules\/data\/list/,
					[]
				);

				const isConnected = registry
					.select( CORE_MODULES )
					.isModuleConnected( 'analytics' );

				expect( isConnected ).toBeUndefined();
			} );
		} );

		describe( 'getModuleFeatures', () => {
			it( 'returns undefined when no modules are loaded', async () => {
				muteFetch(
					/^\/google-site-kit\/v1\/core\/modules\/data\/list/,
					[]
				);
				const featuresLoaded = registry
					.select( CORE_MODULES )
					.getModuleFeatures( 'analytics' );

				// The modules will be undefined whilst loading.
				expect( featuresLoaded ).toBeUndefined();
			} );

			it( 'returns features when modules are loaded', async () => {
				registry.dispatch( CORE_MODULES ).receiveGetModules( FIXTURES );

				const featuresLoaded = registry
					.select( CORE_MODULES )
					.getModuleFeatures( 'analytics' );

				expect( featuresLoaded ).toMatchObject(
					fixturesKeyValue.analytics.features
				);
			} );

			it( 'returns an empty object when requesting features for a non-existent module', async () => {
				registry.dispatch( CORE_MODULES ).receiveGetModules( FIXTURES );

				const featuresLoaded = registry
					.select( CORE_MODULES )
					.getModuleFeatures( 'non-existent-slug' );

				expect( featuresLoaded ).toMatchObject( {} );
			} );
		} );

		describe( 'hasModuleAccess', () => {
			it( 'should use a resolver to make a network request', async () => {
				fetchMock.postOnce(
					/^\/google-site-kit\/v1\/core\/modules\/data\/check-access/,
					{ body: { access: true } }
				);

				let moduleAccess;

				moduleAccess = registry
					.select( CORE_MODULES )
					.hasModuleAccess( 'search-console' );

				// The modules info will be its initial value while the modules info is fetched.
				expect( moduleAccess ).toBeUndefined();
				await untilResolved( registry, CORE_MODULES ).hasModuleAccess(
					'search-console'
				);

				moduleAccess = registry
					.select( CORE_MODULES )
					.hasModuleAccess( 'search-console' );

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( moduleAccess ).toBe( true );
			} );

			it( 'should dispatch an error if the request fails', async () => {
				const response = {
					code: 'internal_server_error',
					message: 'Internal server error',
					data: { status: 500 },
				};

				fetchMock.postOnce(
					/^\/google-site-kit\/v1\/core\/modules\/data\/check-access/,
					{ body: response, status: 500 }
				);

				registry
					.select( CORE_MODULES )
					.hasModuleAccess( 'search-console' );

				await untilResolved( registry, CORE_MODULES ).hasModuleAccess(
					'search-console'
				);

				const moduleAccess = registry
					.select( CORE_MODULES )
					.hasModuleAccess( 'search-console' );

				expect( fetchMock ).toHaveFetchedTimes( 1 );
				expect( moduleAccess ).toEqual( undefined );
				expect( console ).toHaveErrored();
			} );

			it( 'should return undefined if module access is not resolved yet', () => {
				fetchMock.postOnce(
					/^\/google-site-kit\/v1\/core\/modules\/data\/check-access/,
					{ body: { access: true } }
				);

				const moduleAccess = registry
					.select( CORE_MODULES )
					.hasModuleAccess( 'search-console' );

				expect( moduleAccess ).toBeUndefined();
			} );
		} );

		describe( 'getRecoverableModules', () => {
			it( 'should return undefined if `recoverableModules` cannot be loaded', () => {
				global[ dashboardSharingDataBaseVar ] = undefined;

				fetchMock.getOnce(
					/^\/google-site-kit\/v1\/core\/modules\/data\/list/,
					{ body: FIXTURES, status: 200 }
				);

				const recoverableModules = registry
					.select( CORE_MODULES )
					.getRecoverableModules();

				expect( console ).toHaveErrored();
				expect( recoverableModules ).toBeUndefined();
			} );

			it( 'should return undefined if `modules` list cannot be loaded', () => {
				global[ dashboardSharingDataBaseVar ] = recoverableModuleList;

				fetchMock.getOnce(
					/^\/google-site-kit\/v1\/core\/modules\/data\/list/,
					{ body: FIXTURES, status: 200 }
				);

				registry.select( CORE_MODULES ).getRecoverableModules();

				const modules = registry.select( CORE_MODULES ).getModules();

				expect( modules ).toBeUndefined();
			} );

			it( 'should return an empty object if there is no `recoverableModules`', async () => {
				global[ dashboardSharingDataBaseVar ] = {
					recoverableModules: [],
				};

				fetchMock.getOnce(
					/^\/google-site-kit\/v1\/core\/modules\/data\/list/,
					{ body: FIXTURES, status: 200 }
				);

				const initialModules = registry
					.select( CORE_MODULES )
					.getModules();
				// The modules info will be its initial value while the modules
				// info is fetched.
				expect( initialModules ).toBeUndefined();
				await untilResolved( registry, CORE_MODULES ).getModules();

				expect( fetchMock ).toHaveFetchedTimes( 1 );

				const recoverableModules = registry
					.select( CORE_MODULES )
					.getRecoverableModules();

				expect( recoverableModules ).toMatchObject( {} );
			} );

			it( 'should return the modules object for each recoverable module', async () => {
				global[ dashboardSharingDataBaseVar ] = recoverableModuleList;

				fetchMock.getOnce(
					/^\/google-site-kit\/v1\/core\/modules\/data\/list/,
					{ body: FIXTURES, status: 200 }
				);

				const initialModules = registry
					.select( CORE_MODULES )
					.getModules();
				// The modules info will be its initial value while the modules
				// info is fetched.
				expect( initialModules ).toBeUndefined();
				await untilResolved( registry, CORE_MODULES ).getModules();

				expect( fetchMock ).toHaveFetchedTimes( 1 );

				const recoverableModules = registry
					.select( CORE_MODULES )
					.getRecoverableModules();

				expect( recoverableModules ).toMatchObject(
					getModulesBySlugList(
						recoverableModuleList.recoverableModules,
						fixturesKeyValue
					)
				);
			} );
		} );
	} );
} );
