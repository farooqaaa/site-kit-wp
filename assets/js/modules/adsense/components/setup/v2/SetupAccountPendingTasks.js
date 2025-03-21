/**
 * SetupAccountPendingTasks component.
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
import { Fragment, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import Data from 'googlesitekit-data';
import SetupUseSnippetSwitch from './SetupUseSnippetSwitch';
import Button from '../../../../../components/Button';
import { MODULES_ADSENSE } from '../../../datastore/constants';
import { ErrorNotices } from '../../common';
import { trackEvent } from '../../../../../util';
import useViewContext from '../../../../../hooks/useViewContext';
const { useSelect } = Data;
export default function SetupAccountPendingTasks( { accountID } ) {
	const viewContext = useViewContext();

	const onButtonClick = useCallback( () => {
		trackEvent( `${ viewContext }_adsense`, 'review_tasks' );
	}, [ viewContext ] );

	const serviceAccountURL = useSelect( ( select ) =>
		select( MODULES_ADSENSE ).getServiceAccountURL()
	);

	if ( ! accountID || ! serviceAccountURL ) {
		return null;
	}

	return (
		<Fragment>
			<h3 className="googlesitekit-heading-4 googlesitekit-setup-module__title">
				{ __(
					'Your account isn’t ready to show ads yet',
					'google-site-kit'
				) }
			</h3>

			<ErrorNotices />

			<p>
				{ __(
					'You need to fix some things before we can connect Site Kit to your AdSense account.',
					'google-site-kit'
				) }
			</p>

			<SetupUseSnippetSwitch />

			<div className="googlesitekit-setup-module__action">
				<Button onClick={ onButtonClick } href={ serviceAccountURL }>
					{ __( 'Add site to AdSense', 'google-site-kit' ) }
				</Button>
			</div>
		</Fragment>
	);
}

SetupAccountPendingTasks.propTypes = {
	accountID: PropTypes.string.isRequired,
};
