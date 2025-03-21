/**
 * PageSpeed Insights Lab Data report metrics component.
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
import PropTypes from 'prop-types';
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { __, _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import ReportMetric from './ReportMetric';
import MetricsLearnMoreLink from './MetricsLearnMoreLink';
import ErrorText from '../../../../components/ErrorText';

export default function FieldReportMetrics( { data, error } ) {
	const {
		FIRST_INPUT_DELAY_MS: firstInputDelay,
		LARGEST_CONTENTFUL_PAINT_MS: largestContentfulPaint,
		CUMULATIVE_LAYOUT_SHIFT_SCORE: cumulativeLayoutShift,
	} = data?.loadingExperience?.metrics || {};

	if ( error ) {
		return (
			<div className="googlesitekit-pagespeed-insights-web-vitals-metrics">
				<div className="googlesitekit-pagespeed-report__row googlesitekit-pagespeed-report__row--first">
					<ErrorText message={ error.message } />
				</div>
			</div>
		);
	}

	if (
		! firstInputDelay ||
		! largestContentfulPaint ||
		! cumulativeLayoutShift
	) {
		return (
			<div className="googlesitekit-pagespeed-insights-web-vitals-metrics googlesitekit-pagespeed-insights-web-vitals-metrics--field-data-unavailable">
				<div className="googlesitekit-pagespeed-insights-web-vitals-metrics__field-data-unavailable-content">
					<h3>
						{ __( 'Field data unavailable', 'google-site-kit' ) }
					</h3>
					<p>
						{ __(
							'Field data shows how real users actually loaded and interacted with your page. We don’t have enough real-world experience and speed data for this page. It may be new, or not enough users with Chrome browsers have visited it yet.',
							'google-site-kit'
						) }
					</p>
				</div>
			</div>
		);
	}

	// Convert milliseconds to seconds with 1 fraction digit.
	const lcpSeconds = (
		Math.round( largestContentfulPaint.percentile / 100 ) / 10
	).toFixed( 1 );
	// Convert 2 digit score to a decimal between 0 and 1, with 2 fraction digits.
	const cls = ( cumulativeLayoutShift.percentile / 100 ).toFixed( 2 );

	return (
		<div className="googlesitekit-pagespeed-insights-web-vitals-metrics">
			<div className="googlesitekit-pagespeed-report__row googlesitekit-pagespeed-report__row--first">
				<p>
					{ __(
						'Field data shows how real users actually loaded and interacted with your page over time.',
						'google-site-kit'
					) }{ ' ' }
					<MetricsLearnMoreLink />
				</p>
			</div>
			<table
				className={ classnames(
					'googlesitekit-table',
					'googlesitekit-table--with-list'
				) }
			>
				<thead>
					<tr>
						<th>{ __( 'Metric Name', 'google-site-kit' ) }</th>
						<th>{ __( 'Metric Value', 'google-site-kit' ) }</th>
					</tr>
				</thead>
				<tbody>
					<ReportMetric
						title={ _x(
							'First Input Delay',
							'core web vitals name',
							'google-site-kit'
						) }
						description={ __(
							'Time it takes for the browser to respond when people first interact with the page',
							'google-site-kit'
						) }
						displayValue={ `${ firstInputDelay.percentile } ms` }
						category={ firstInputDelay.category }
					/>
					<ReportMetric
						title={ _x(
							'Largest Contentful Paint',
							'core web vitals name',
							'google-site-kit'
						) }
						description={ __(
							'Time it takes for the page to load',
							'google-site-kit'
						) }
						displayValue={ `${ lcpSeconds } s` }
						category={ largestContentfulPaint.category }
					/>
					<ReportMetric
						title={ _x(
							'Cumulative Layout Shift',
							'core web vitals name',
							'google-site-kit'
						) }
						description={ __(
							'How stable the elements on the page are',
							'google-site-kit'
						) }
						displayValue={ cls }
						category={ cumulativeLayoutShift.category }
						isLast
					/>
				</tbody>
			</table>
		</div>
	);
}

FieldReportMetrics.propTypes = {
	data: PropTypes.object,
	error: PropTypes.object,
};
