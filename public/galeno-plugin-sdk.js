/**
 * Galeno Plugin SDK
 * 
 * This SDK provides a simple API for plugins to interact with the Galeno application.
 * Include this script in your plugin's HTML file to access the GalenoAPI.
 * 
 * Example usage:
 * ```html
 * <script src="../galeno-plugin-sdk.js"></script>
 * <script>
 *   const patients = await GalenoAPI.getPatients({ search: 'García' });
 *   console.log(patients);
 * </script>
 * ```
 */

(function () {
    'use strict';

    const REQUEST_TIMEOUT_MS = 30000;
    const SDK_GLOBAL_KEY = 'GalenoAPI';
    const SDK_SCRIPT_DATA_ATTR = 'galenoSdk';
    let grantedPermissions = [];
    let permissionsLoaded = false;
    let sdkLoadPromise = null;

    function resolveFrontendOrigin() {
        try {
            if (document.referrer) {
                return new URL(document.referrer).origin;
            }
        } catch {
            // Ignore and use fallback.
        }

        // Dev fallback (Vite default)
        return 'http://localhost:1420';
    }

    function getSDKUrl(path) {
        const normalizedPath = typeof path === 'string' && path.trim().length > 0
            ? path.trim()
            : '/galeno-plugin-sdk.js';

        try {
            const origin = resolveFrontendOrigin();
            return new URL(normalizedPath, origin).toString();
        } catch {
            return normalizedPath;
        }
    }

    function loadGalenoSDK(options = {}) {
        if (window[SDK_GLOBAL_KEY]) {
            return Promise.resolve(window[SDK_GLOBAL_KEY]);
        }

        if (sdkLoadPromise) {
            return sdkLoadPromise;
        }

        sdkLoadPromise = new Promise((resolve, reject) => {
            const sdkUrl = getSDKUrl(options.path);

            const existing = document.querySelector(`script[data-${SDK_SCRIPT_DATA_ATTR}="1"]`);
            if (existing) {
                existing.addEventListener('load', () => {
                    if (window[SDK_GLOBAL_KEY]) {
                        resolve(window[SDK_GLOBAL_KEY]);
                        return;
                    }
                    reject(new Error('SDK script loaded but GalenoAPI was not found on window'));
                }, { once: true });
                existing.addEventListener('error', () => {
                    sdkLoadPromise = null;
                    reject(new Error(`Failed to load SDK from ${sdkUrl}`));
                }, { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = sdkUrl;
            script.async = true;
            script.dataset[SDK_SCRIPT_DATA_ATTR] = '1';
            script.addEventListener('load', () => {
                if (window[SDK_GLOBAL_KEY]) {
                    resolve(window[SDK_GLOBAL_KEY]);
                    return;
                }
                sdkLoadPromise = null;
                reject(new Error('SDK script loaded but GalenoAPI was not found on window'));
            }, { once: true });
            script.addEventListener('error', () => {
                sdkLoadPromise = null;
                reject(new Error(`Failed to load SDK from ${sdkUrl}`));
            }, { once: true });

            document.head.appendChild(script);
        });

        return sdkLoadPromise;
    }

    // Global helper for plugin pages: await window.loadGalenoSDK()
    window.loadGalenoSDK = loadGalenoSDK;

    function readRequestError(data) {
        if (!data) return 'Unknown SDK bridge error';
        if (typeof data.error === 'string') return data.error;
        if (typeof data.message === 'string') return data.message;
        return 'Unknown SDK bridge error';
    }

    function createRequestId() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID();
        }
        return `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }

    const GalenoAPI = {
        /**
         * Internal method to call the parent application
         * @private
         */
        call(action, payload = {}) {
            return new Promise((resolve, reject) => {
                const requestId = createRequestId();
                let resolved = false;

                // Send message to parent
                window.parent.postMessage({ action, payload, requestId }, '*');

                // Wait for response
                const handler = (event) => {
                    if (!event.data || event.data.requestId !== requestId) return;

                    resolved = true;

                    window.removeEventListener('message', handler);

                    if (event.data.error) {
                        reject(new Error(readRequestError(event.data)));
                    } else {
                        resolve(event.data.result);
                    }
                };

                window.addEventListener('message', handler);

                // Timeout after 30 seconds
                setTimeout(() => {
                    if (resolved) return;
                    window.removeEventListener('message', handler);
                    reject(new Error(`Request timeout after ${REQUEST_TIMEOUT_MS}ms`));
                }, REQUEST_TIMEOUT_MS);
            });
        },

        /**
         * Get permissions granted to this plugin by the host application.
         * This request does not require plugin permissions.
         * @returns {Promise<string[]>}
         */
        async getGrantedPermissions() {
            if (permissionsLoaded) {
                return [...grantedPermissions];
            }

            const permissions = await this.call('sdk_get_permissions');
            grantedPermissions = Array.isArray(permissions) ? permissions : [];
            permissionsLoaded = true;

            return [...grantedPermissions];
        },

        /**
         * Check whether this plugin has a specific permission.
         * @param {string} permission - Permission key like `patients:write`
         * @returns {Promise<boolean>}
         */
        async hasPermission(permission) {
            if (!permission || typeof permission !== 'string') {
                return false;
            }

            const permissions = await this.getGrantedPermissions();
            return permissions.includes(permission);
        },

        /**
         * Request one or more permissions at runtime.
         * The host may show a consent dialog to the user.
         * @param {string[]} permissions - Permission keys to request
         * @returns {Promise<{grantedPermissions:string[], granted:string[], denied:string[]}>}
         */
        async requestPermissions(permissions = []) {
            const requested = Array.isArray(permissions)
                ? Array.from(new Set(permissions.filter((permission) => typeof permission === 'string' && permission.length > 0)))
                : [];

            if (requested.length === 0) {
                return {
                    grantedPermissions: await this.getGrantedPermissions(),
                    granted: [],
                    denied: [],
                };
            }

            const result = await this.call('sdk_request_permissions', { permissions: requested });

            const grantedList = Array.isArray(result?.grantedPermissions)
                ? result.grantedPermissions
                : await this.getGrantedPermissions();

            grantedPermissions = [...grantedList];
            permissionsLoaded = true;

            return {
                grantedPermissions: [...grantedPermissions],
                granted: Array.isArray(result?.granted) ? result.granted : [],
                denied: Array.isArray(result?.denied) ? result.denied : [],
            };
        },

        /**
         * Request a single permission at runtime.
         * @param {string} permission
         * @returns {Promise<boolean>} True when permission is granted.
         */
        async requestPermission(permission) {
            const response = await this.requestPermissions([permission]);
            return response.granted.includes(permission);
        },

        // ===== PATIENTS API =====

        /**
         * Get list of patients
         * @param {Object} filters - Filter options
         * @param {string} filters.search - Search term
         * @param {number} filters.limit - Maximum number of results
         * @param {number} filters.offset - Offset for pagination
         * @returns {Promise<Array>} List of patients
         */
        getPatients(filters = {}) {
            return this.call('get_patients', filters);
        },

        /**
         * Get a single patient by ID
         * @param {number} patientId - Patient ID
         * @returns {Promise<Object>} Patient data
         */
        getPatient(patientId) {
            return this.call('get_patient', { patientId });
        },

        /**
         * Create a new patient
         * @param {Object} patientData - Patient data
         * @returns {Promise<Object>} Created patient
         */
        createPatient(patientData) {
            return this.call('create_patient', patientData);
        },

        /**
         * Update an existing patient
         * @param {number} patientId - Patient ID
         * @param {Object} patientData - Updated patient data
         * @returns {Promise<Object>} Updated patient
         */
        updatePatient(patientId, patientData) {
            return this.call('update_patient', { patientId, ...patientData });
        },

        // ===== TREATMENTS API =====

        /**
         * Get list of treatments
         * @param {Object} filters - Filter options
         * @returns {Promise<Array>} List of treatments
         */
        getTreatments(filters = {}) {
            return this.call('get_treatments', filters);
        },

        /**
         * Get a single treatment by ID
         * @param {number} treatmentId - Treatment ID
         * @returns {Promise<Object>} Treatment data
         */
        getTreatment(treatmentId) {
            return this.call('get_treatment', { treatmentId });
        },

        /**
         * Create a new treatment
         * @param {Object} treatmentData - Treatment data
         * @returns {Promise<Object>} Created treatment
         */
        createTreatment(treatmentData) {
            return this.call('create_treatment', treatmentData);
        },

        /**
         * Update an existing treatment
         * @param {number} treatmentId - Treatment ID
         * @param {Object} treatmentData - Updated treatment data
         * @returns {Promise<Object>} Updated treatment
         */
        updateTreatment(treatmentId, treatmentData) {
            return this.call('update_treatment', { treatmentId, ...treatmentData });
        },

        // ===== APPOINTMENTS API =====

        /**
         * Get list of appointments
         * @param {Object} filters - Filter options
         * @returns {Promise<Array>} List of appointments
         */
        getAppointments(filters = {}) {
            return this.call('get_appointments', filters);
        },

        /**
         * Get a single appointment by ID
         * @param {number} appointmentId - Appointment ID
         * @returns {Promise<Object>} Appointment data
         */
        getAppointment(appointmentId) {
            return this.call('get_appointment', { appointmentId });
        },

        /**
         * Create a new appointment
         * @param {Object} appointmentData - Appointment data
         * @returns {Promise<Object>} Created appointment
         */
        createAppointment(appointmentData) {
            return this.call('create_appointment', appointmentData);
        },

        /**
         * Update an existing appointment
         * @param {number} appointmentId - Appointment ID
         * @param {Object} appointmentData - Updated appointment data
         * @returns {Promise<Object>} Updated appointment
         */
        updateAppointment(appointmentId, appointmentData) {
            return this.call('update_appointment', { appointmentId, ...appointmentData });
        },

        /**
         * Delete an appointment
         * @param {number} appointmentId - Appointment ID
         * @returns {Promise<void>}
         */
        deleteAppointment(appointmentId) {
            return this.call('delete_appointment', { appointmentId });
        },

        // ===== PAYMENTS API =====

        /**
         * Get list of payments
         * @param {Object} filters - Filter options
         * @returns {Promise<Array>} List of payments
         */
        getPayments(filters = {}) {
            return this.call('get_payments', filters);
        },

        /**
         * Get a single payment by ID
         * @param {number} paymentId - Payment ID
         * @returns {Promise<Object>} Payment data
         */
        getPayment(paymentId) {
            return this.call('get_payment', { paymentId });
        },

        /**
         * Create a new payment
         * @param {Object} paymentData - Payment data
         * @returns {Promise<Object>} Created payment
         */
        createPayment(paymentData) {
            return this.call('create_payment', paymentData);
        },

        /**
         * Update an existing payment
         * @param {number} paymentId - Payment ID
         * @param {Object} paymentData - Updated payment data
         * @returns {Promise<Object>} Updated payment
         */
        updatePayment(paymentId, paymentData) {
            return this.call('update_payment', { paymentId, ...paymentData });
        },

        // ===== STORAGE API =====

        /**
         * Get a value from plugin storage
         * @param {string} key - Storage key
         * @returns {Promise<any>} Stored value
         */
        storageGet(key) {
            return this.call('storage_get', { key });
        },

        /**
         * Set a value in plugin storage
         * @param {string} key - Storage key
         * @param {any} value - Value to store
         * @returns {Promise<void>}
         */
        storageSet(key, value) {
            return this.call('storage_set', { key, value });
        },

        /**
         * Remove a value from plugin storage
         * @param {string} key - Storage key
         * @returns {Promise<void>}
         */
        storageRemove(key) {
            return this.call('storage_remove', { key });
        },

        /**
         * Clear all plugin storage
         * @returns {Promise<void>}
         */
        storageClear() {
            return this.call('storage_clear');
        },

        // ===== SYSTEM API =====

        /**
         * Execute a system command (requires system:commands permission)
         * @param {string} command - Command to execute
         * @returns {Promise<string>} Command output
         */
        executeCommand(command) {
            return this.call('execute_command', { command });
        },

        /**
         * Show a notification to the user
         * @param {Object} options - Notification options
         * @param {string} options.title - Notification title
         * @param {string} options.message - Notification message
         * @param {string} options.type - Notification type (info, success, warning, error)
         * @returns {Promise<void>}
         */
        showNotification(options) {
            return this.call('show_notification', options);
        },

        /**
         * Clears locally cached permission state.
         * Useful during development hot-reload.
         */
        resetPermissionCache() {
            grantedPermissions = [];
            permissionsLoaded = false;
        },
    };

    // Expose API globally
    window.GalenoAPI = GalenoAPI;
    window.loadGalenoSDK = (options = {}) => {
        if (window.GalenoAPI) {
            return Promise.resolve(window.GalenoAPI);
        }
        return loadGalenoSDK(options);
    };

    // Also expose as module for modern bundlers
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = GalenoAPI;
    }
})();
