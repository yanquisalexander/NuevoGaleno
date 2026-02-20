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

    const GalenoAPI = {
        /**
         * Internal method to call the parent application
         * @private
         */
        call(action, payload = {}) {
            return new Promise((resolve, reject) => {
                const requestId = crypto.randomUUID();

                // Send message to parent
                window.parent.postMessage({ action, payload, requestId }, '*');

                // Wait for response
                const handler = (event) => {
                    if (event.data.requestId !== requestId) return;

                    window.removeEventListener('message', handler);

                    if (event.data.error) {
                        reject(new Error(event.data.error));
                    } else {
                        resolve(event.data.result);
                    }
                };

                window.addEventListener('message', handler);

                // Timeout after 30 seconds
                setTimeout(() => {
                    window.removeEventListener('message', handler);
                    reject(new Error('Request timeout'));
                }, 30000);
            });
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
    };

    // Expose API globally
    window.GalenoAPI = GalenoAPI;

    // Also expose as module for modern bundlers
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = GalenoAPI;
    }
})();
