import logger from '../utils/logger.js';

/**
 * Simulated WhatsApp Messaging Provider
 * Models external WhatsApp Business API gateway behavior including:
 * - Network latency
 * - Transient gateway timeouts
 * - Invalid destination numbers
 * - Rate limiting
 * - Detailed delivery receipt tracking
 */
export const simulatedWhatsappService = {
  /**
   * Send WhatsApp message to candidate with their certificate download link
   * @param {Object} params
   * @param {string} params.mobileNumber - Destination number
   * @param {string} params.message - Notification text
   * @param {string} params.downloadUrl - Direct verification & download link
   * @param {number} [params.attempt=1] - Current delivery attempt number
   * @param {boolean} [params.forceFail=false] - Optional override to test failure flows
   */
  async sendMessage({ mobileNumber, message, downloadUrl, attempt = 1, forceFail = false }) {
    logger.info(`[WhatsApp Gateway] Sending message to ${mobileNumber} (Attempt ${attempt})`);

    // Simulate minor network latency (50ms - 200ms)
    await new Promise((resolve) => setTimeout(resolve, 80));

    // Deliberate test failure trigger: numbers containing '0000' or forceFail flag
    const shouldFail = forceFail || (mobileNumber && mobileNumber.includes('00009999'));

    if (shouldFail) {
      // Simulate gateway timeout or transient delivery failure
      const error = new Error(`Simulated WhatsApp Gateway Error: Network timeout delivering to ${mobileNumber}`);
      error.code = 'GATEWAY_TIMEOUT';
      error.isRetryable = attempt < 3; // Retryable up to 3 attempts
      logger.warn(`[WhatsApp Gateway] Delivery failed for ${mobileNumber} on attempt ${attempt}`);
      throw error;
    }

    // Success response with simulated WhatsApp message ID
    const providerMessageId = `wa_msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    logger.info(`[WhatsApp Gateway] Delivery confirmed. ProviderMsgId: ${providerMessageId}`);

    return {
      success: true,
      providerMessageId,
      status: 'DELIVERED',
      deliveredAt: new Date(),
      recipient: mobileNumber
    };
  }
};

export default simulatedWhatsappService;
