/**
 * DashboardEntityApp component.
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
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { createInterpolateElement, Fragment } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import Data from 'googlesitekit-data';
import Header from './Header';
import {
	CONTEXT_ENTITY_DASHBOARD_TRAFFIC,
	CONTEXT_ENTITY_DASHBOARD_CONTENT,
	CONTEXT_ENTITY_DASHBOARD_SPEED,
	CONTEXT_ENTITY_DASHBOARD_MONETIZATION,
} from '../googlesitekit/widgets/default-contexts';
import WidgetContextRenderer from '../googlesitekit/widgets/components/WidgetContextRenderer';
import EntitySearchInput from './EntitySearchInput';
import DateRangeSelector from './DateRangeSelector';
import HelpMenu from './help/HelpMenu';
import {
	ANCHOR_ID_CONTENT,
	ANCHOR_ID_MONETIZATION,
	ANCHOR_ID_SPEED,
	ANCHOR_ID_TRAFFIC,
} from '../googlesitekit/constants';
import { CORE_SITE } from '../googlesitekit/datastore/site/constants';
import Link from './Link';
import VisuallyHidden from './VisuallyHidden';
import { Cell, Grid, Row } from '../material-components';
import PageHeader from './PageHeader';
import Layout from './layout/Layout';
import { CORE_WIDGETS } from '../googlesitekit/widgets/datastore/constants';
import ScrollEffect from './ScrollEffect';
import EntityBannerNotifications from './notifications/EntityBannerNotifications';
const { useSelect } = Data;

function DashboardEntityApp() {
	const currentEntityURL = useSelect( ( select ) =>
		select( CORE_SITE ).getCurrentEntityURL()
	);
	const permaLink = useSelect( ( select ) =>
		select( CORE_SITE ).getPermaLinkParam()
	);
	const dashboardURL = useSelect( ( select ) =>
		select( CORE_SITE ).getAdminURL( 'googlesitekit-dashboard' )
	);

	const isTrafficActive = useSelect( ( select ) =>
		select( CORE_WIDGETS ).isWidgetContextActive(
			CONTEXT_ENTITY_DASHBOARD_TRAFFIC
		)
	);

	const isContentActive = useSelect( ( select ) =>
		select( CORE_WIDGETS ).isWidgetContextActive(
			CONTEXT_ENTITY_DASHBOARD_CONTENT
		)
	);

	const isSpeedActive = useSelect( ( select ) =>
		select( CORE_WIDGETS ).isWidgetContextActive(
			CONTEXT_ENTITY_DASHBOARD_SPEED
		)
	);

	const isMonetizationActive = useSelect( ( select ) =>
		select( CORE_WIDGETS ).isWidgetContextActive(
			CONTEXT_ENTITY_DASHBOARD_MONETIZATION
		)
	);

	let lastWidgetAnchor = null;

	if ( isMonetizationActive ) {
		lastWidgetAnchor = ANCHOR_ID_MONETIZATION;
	} else if ( isSpeedActive ) {
		lastWidgetAnchor = ANCHOR_ID_SPEED;
	} else if ( isContentActive ) {
		lastWidgetAnchor = ANCHOR_ID_CONTENT;
	} else if ( isTrafficActive ) {
		lastWidgetAnchor = ANCHOR_ID_TRAFFIC;
	}

	if ( currentEntityURL === null ) {
		return (
			<div className="googlesitekit-widget-context googlesitekit-module-page googlesitekit-dashboard-single-url">
				<ScrollEffect />
				<Grid>
					<Row>
						<Cell size={ 12 }>
							<Fragment>
								<Link href={ dashboardURL } inherit back small>
									{ __(
										'Back to the Site Kit Dashboard',
										'google-site-kit'
									) }
								</Link>

								<PageHeader
									title={ __(
										'Detailed Page Stats',
										'google-site-kit'
									) }
									className="googlesitekit-heading-2 googlesitekit-dashboard-single-url__heading"
									fullWidth
								/>

								<Layout className="googlesitekit-dashboard-single-url__entity-header">
									<Grid>
										<Row>
											<Cell size={ 12 }>
												<p>
													{ createInterpolateElement(
														sprintf(
															/* translators: %s: current entity URL. */
															__(
																'It looks like the URL %s is not part of this site or is not based on standard WordPress content types, therefore there is no data available to display. Visit our <link1>support forums</link1> or <link2><VisuallyHidden>Site Kit </VisuallyHidden>website</link2> for support or further information.',
																'google-site-kit'
															),
															`<strong>${ permaLink }</strong>`
														),
														{
															strong: <strong />,
															link1: (
																<Link
																	href="https://wordpress.org/support/plugin/google-site-kit/"
																	external
																	inherit
																/>
															),
															link2: (
																<Link
																	href="https://sitekit.withgoogle.com/documentation/troubleshooting/dashboard/#url-not-part-of-this-site"
																	external
																	inherit
																/>
															),
															VisuallyHidden: (
																<VisuallyHidden />
															),
														}
													) }
												</p>
											</Cell>
										</Row>
									</Grid>
								</Layout>
							</Fragment>
						</Cell>
					</Row>
				</Grid>
			</div>
		);
	}
	return (
		<Fragment>
			<ScrollEffect />
			<Header subHeader={ <EntityBannerNotifications /> } showNavigation>
				<EntitySearchInput />
				<DateRangeSelector />
				<HelpMenu />
			</Header>
			<WidgetContextRenderer
				id={ ANCHOR_ID_TRAFFIC }
				slug={ CONTEXT_ENTITY_DASHBOARD_TRAFFIC }
				className={ classnames( {
					'googlesitekit-widget-context--last':
						lastWidgetAnchor === ANCHOR_ID_TRAFFIC,
				} ) }
			/>
			<WidgetContextRenderer
				id={ ANCHOR_ID_CONTENT }
				slug={ CONTEXT_ENTITY_DASHBOARD_CONTENT }
				className={ classnames( {
					'googlesitekit-widget-context--last':
						lastWidgetAnchor === ANCHOR_ID_CONTENT,
				} ) }
			/>
			<WidgetContextRenderer
				id={ ANCHOR_ID_SPEED }
				slug={ CONTEXT_ENTITY_DASHBOARD_SPEED }
				className={ classnames( {
					'googlesitekit-widget-context--last':
						lastWidgetAnchor === ANCHOR_ID_SPEED,
				} ) }
			/>
			<WidgetContextRenderer
				id={ ANCHOR_ID_MONETIZATION }
				slug={ CONTEXT_ENTITY_DASHBOARD_MONETIZATION }
				className={ classnames( {
					'googlesitekit-widget-context--last':
						lastWidgetAnchor === ANCHOR_ID_MONETIZATION,
				} ) }
			/>
		</Fragment>
	);
}

export default DashboardEntityApp;
