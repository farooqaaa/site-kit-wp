/**
 * GatheringDataNotice component.
 *
 * Site Kit by Google, Copyright 2022 Google LLC
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

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

function GatheringDataNotice( { style = 'default' } ) {
	return (
		<div
			className={ `googlesitekit-gathering-data-notice googlesitekit-gathering-data-notice--has-style-${ style }` }
		>
			<p>{ __( 'Gathering data…', 'google-site-kit' ) }</p>
		</div>
	);
}

GatheringDataNotice.propTypes = {
	style: PropTypes.oneOf( [ 'small', 'default', 'overlay' ] ),
};

export default GatheringDataNotice;
