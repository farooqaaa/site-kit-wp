/**
 * AdSense Main setup component.
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
import { useUpdateEffect } from 'react-use';
import PropTypes from 'prop-types';

/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';
import { useEffect, useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import Data from 'googlesitekit-data';
import ProgressBar from '../../../../../components/ProgressBar';
import AdSenseIcon from '../../../../../../svg/graphics/adsense.svg';
import SetupAccount from './SetupAccount';
import SetupCreateAccount from './SetupCreateAccount';
import SetupSelectAccount from './SetupSelectAccount';
import { trackEvent } from '../../../../../util';
import { AdBlockerWarning, ErrorNotices } from '../../common';
import { MODULES_ADSENSE } from '../../../datastore/constants';
import {
	ACCOUNT_STATUS_READY,
	ACCOUNT_STATUS_NONE,
	ACCOUNT_STATUS_MULTIPLE,
} from '../../../util/status';
import useViewContext from '../../../../../hooks/useViewContext';
const { useSelect, useDispatch } = Data;

export default function SetupMain( { finishSetup } ) {
	const viewContext = useViewContext();
	const eventCategory = `${ viewContext }_adsense`;

	const {
		clearError,
		resetAccounts,
		resetAlerts,
		resetClients,
		resetSites,
		setAccountID,
		setAccountStatus,
		submitChanges,
	} = useDispatch( MODULES_ADSENSE );

	const [
		isAwaitingBackgroundSubmit,
		setIsAwaitingBackgroundSubmit,
	] = useState( false );
	// Submit changes for determined parameters in the background when they are valid.
	const [ isSubmittingInBackground, setIsSubmittingInBackground ] = useState(
		false
	);
	const isAdBlockerActive = useSelect( ( select ) =>
		select( MODULES_ADSENSE ).isAdBlockerActive()
	);
	const accounts = useSelect( ( select ) =>
		select( MODULES_ADSENSE ).getAccounts()
	);
	const accountID = useSelect( ( select ) =>
		select( MODULES_ADSENSE ).getAccountID()
	);
	const hasAccountIDChanged = useSelect( ( select ) =>
		select( MODULES_ADSENSE ).hasSettingChanged( 'accountID' )
	);
	const hasClientIDChanged = useSelect( ( select ) =>
		select( MODULES_ADSENSE ).hasSettingChanged( 'clientID' )
	);
	// Check whether settings differ from server and are valid.
	const canSubmitChanges = useSelect( ( select ) =>
		select( MODULES_ADSENSE ).canSubmitChanges()
	);

	const clientID = useSelect( ( select ) =>
		select( MODULES_ADSENSE ).getClientID()
	);
	const accountStatus = useSelect( ( select ) =>
		select( MODULES_ADSENSE ).getAccountStatus()
	);
	const hasAccountStatusChanged = useSelect( ( select ) =>
		select( MODULES_ADSENSE ).hasSettingChanged( 'accountStatus' )
	);
	const siteStatus = useSelect( ( select ) =>
		select( MODULES_ADSENSE ).getSiteStatus()
	);
	const hasSiteStatusChanged = useSelect( ( select ) =>
		select( MODULES_ADSENSE ).hasSettingChanged( 'siteStatus' )
	);
	const hasErrors = useSelect( ( select ) =>
		select( MODULES_ADSENSE ).hasErrors()
	);
	const hasResolvedAccounts = useSelect( ( select ) =>
		select( MODULES_ADSENSE ).hasFinishedResolution( 'getAccounts' )
	);

	const account = accounts?.find( ( { _id } ) => _id === accountID );

	useUpdateEffect( () => {
		if (
			( hasAccountIDChanged && accountID !== undefined ) ||
			( hasClientIDChanged && clientID !== undefined ) ||
			( hasAccountStatusChanged && accountStatus !== undefined ) ||
			( hasSiteStatusChanged && siteStatus !== undefined )
		) {
			setIsAwaitingBackgroundSubmit( true );
		}
	}, [
		accountID,
		hasAccountIDChanged,
		clientID,
		hasClientIDChanged,
		accountStatus,
		hasAccountStatusChanged,
		siteStatus,
		hasSiteStatusChanged,
	] );

	// Update current account ID setting on-the-fly.
	useEffect( () => {
		if (
			accounts?.length === 1 &&
			( ! accountID || accounts[ 0 ]._id !== accountID )
		) {
			setAccountID( accounts[ 0 ]._id );
			// Set flag to await background submission.
			setIsAwaitingBackgroundSubmit( true );
		}
	}, [ accounts, accountID, setAccountID ] );

	// Update account status on-the-fly.
	useEffect( () => {
		if ( accounts?.length === 0 ) {
			setAccountStatus( ACCOUNT_STATUS_NONE );
		} else if ( accounts?.length > 1 && ! accountID ) {
			setAccountStatus( ACCOUNT_STATUS_MULTIPLE );
		}
	}, [ setAccountStatus, accountID, accounts ] );

	// If a background submission should happen and changes are valid to be
	// submitted, do that here. This is wrapped in a separate useEffect hook
	// and relies on isAwaitingBackgroundSubmit since the above useEffect hook
	// must not depend on canSubmitChanges, since that is also updated when
	// other than the above four settings are updated.
	useEffect( () => {
		if (
			! isAwaitingBackgroundSubmit ||
			isSubmittingInBackground ||
			! canSubmitChanges
		) {
			return;
		}

		// Set flag to false since we are gonna run the background submission
		// right now.
		setIsAwaitingBackgroundSubmit( false );

		// Set internal state for submitting in background to avoid sudden
		// rendering of a progress bar.
		( async () => {
			setIsSubmittingInBackground( true );
			await submitChanges();
			setIsSubmittingInBackground( false );
		} )();
	}, [
		isAwaitingBackgroundSubmit,
		isSubmittingInBackground,
		canSubmitChanges,
		submitChanges,
	] );

	// Reset all fetched data when user re-focuses tab.
	useEffect( () => {
		let timeout;
		let needReset = false;

		// Count 15  seconds once user focuses elsewhere.
		const countIdleTime = () => {
			timeout = global.setTimeout( () => {
				needReset = true;
			}, 15000 );
		};

		// Reset when user re-focuses after 15 seconds or more.
		const reset = () => {
			global.clearTimeout( timeout );

			// Do not reset if user has been away for less than 15 seconds.
			if ( ! needReset ) {
				return;
			}
			needReset = false;

			// Do not reset if account status has not been determined yet, or
			// if the account is approved.
			if (
				undefined === accountStatus ||
				ACCOUNT_STATUS_READY === accountStatus
			) {
				return;
			}

			// Unset any potential error.
			clearError();
			// Reset all data to force re-fetch.
			resetAccounts();
			resetAlerts();
			resetClients();
			resetSites();
		};
		global.addEventListener( 'focus', reset );
		global.addEventListener( 'blur', countIdleTime );
		return () => {
			global.removeEventListener( 'focus', reset );
			global.removeEventListener( 'blur', countIdleTime );
			global.clearTimeout( timeout );
		};
	}, [
		accountStatus,
		clearError,
		resetAccounts,
		resetAlerts,
		resetClients,
		resetSites,
	] );

	useEffect( () => {
		if ( accountStatus !== undefined ) {
			trackEvent( eventCategory, 'receive_account_state', accountStatus );
		}
	}, [ eventCategory, accountStatus ] );

	useEffect( () => {
		if ( siteStatus !== undefined ) {
			trackEvent( eventCategory, 'receive_site_state', siteStatus );
		}
	}, [ eventCategory, siteStatus ] );

	let viewComponent;

	if ( ! hasResolvedAccounts ) {
		viewComponent = <ProgressBar />;
	} else if ( hasErrors ) {
		viewComponent = <ErrorNotices />;
	} else if ( ! accounts?.length ) {
		viewComponent = <SetupCreateAccount />;
	} else if ( ! accountID ) {
		viewComponent = <SetupSelectAccount />;
	} else {
		viewComponent = (
			<SetupAccount account={ account } finishSetup={ finishSetup } />
		);
	}

	return (
		<div className="googlesitekit-setup-module googlesitekit-setup-module--adsense">
			<div className="googlesitekit-setup-module__step">
				<div className="googlesitekit-setup-module__logo">
					<AdSenseIcon width="33" height="33" />
				</div>

				<h2 className="googlesitekit-heading-3 googlesitekit-setup-module__title">
					{ _x( 'AdSense', 'Service name', 'google-site-kit' ) }
				</h2>
			</div>

			<div className="googlesitekit-setup-module__step">
				<AdBlockerWarning />

				{ ! isAdBlockerActive && viewComponent }
			</div>
		</div>
	);
}

SetupMain.propTypes = {
	finishSetup: PropTypes.func,
};
