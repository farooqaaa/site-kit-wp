/**
 * `useChecks` hook.
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
import { useEffect } from '@wordpress/element';

/**
 * Debounces a value after the specified delay.
 *
 * @since 1.16.0
 *
 * @param {Array} checks The checks to run.
 * @return {string} The update value after the delay.
 */
export async function useChecks( checks ) {
	const checkStatus = {
		complete: false,
		error: null,
	};

	useEffect(
		async () => {
			try {
				await Promise.all( checks.map( ( check ) => check() ) );
				checkStatus.complete = true;
			} catch ( error ) {
				checkStatus.error = error;
			}

			return checkStatus;
		},
		[ checks, checkStatus ]
	);

	return checkStatus;
}
