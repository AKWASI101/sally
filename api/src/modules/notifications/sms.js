/**
* SMS notification service using mNotify API.
*
* Per SRS §FR-NOTIF-06: SMS failures are logged but never block the order flow.
* All functions are fire-and-forget — they catch their own errors.
*/

const env = require('../../config/env');
const logger = require('../../utils/logger');

const MNOTIFY_BASE_URL = 'https://apps.mnotify.net/smsapi';

/**
 * Send an SMS via mNotify.
 *
 * @param {string} to       Phone number (e.g. '0244000000')
 * @param {string} message  SMS body (max 160 chars for single SMS)
 * @returns {Promise<boolean>} true if sent, false if failed
 */
const sendSMS = async (to, message) => {
  if (!env.mnotifyApiKey) {
    logger.warn('mNotify API key not configured — SMS skipped', { to });
    return false;
  }

  try {
    const params = new URLSearchParams({
      key: env.mnotifyApiKey,
      to,
      msg: message,
      sender_id: 'King Sally',
    });

    const response = await fetch(`${MNOTIFY_BASE_URL}?${params.toString()}`);
    const data = await response.text();

    logger.info('SMS sent via mNotify', { to, status: data });
    return true;
  } catch (err) {
    logger.error('SMS send failed', { to, error: err.message });
    return false;
  }
};

/**
 * FR-NOTIF-01: Notify customer that their order has been placed.
 */
const notifyOrderPlaced = async (order) => {
  const message = `Hi ${order.customer_name}, your order ${order.reference} has been placed! Total: GHS ${order.total}. Please complete your payment by following the instructions in your checkout screen  Reference: ${order.reference}.`;
  await sendSMS(order.customer_phone, message);
};

/**
 * FR-NOTIF-04: Notify admin of a new order.
 */
const notifyAdminNewOrder = async (order) => {
  // Admin phone could be configured via env in the future.
  // For now, we just log it — the dashboard pending feed handles visibility.
  logger.info('New order notification (admin)', {
    reference: order.reference,
    total: order.total,
    customer: order.customer_name,
  });
};

/**
 * FR-NOTIF-02: Notify customer that payment is confirmed.
 */
const notifyPaymentConfirmed = async (order) => {
  const message = `Hi ${order.customer_name}, your payment for order ${order.reference} (GHS ${order.total}) has been confirmed. Thank you!`;
  await sendSMS(order.customer_phone, message);
};

/**
 * FR-NOTIF-03: Notify customer that order has been shipped.
 */
const notifyOrderShipped = async (order, trackingNumber) => {
  let message = `Hi ${order.customer_name}, your order ${order.reference} has been shipped!`;
  if (trackingNumber) {
    message += ` Courier tracking: ${trackingNumber}`;
  }
  await sendSMS(order.customer_phone, message);
};

module.exports = {
  sendSMS,
  notifyOrderPlaced,
  notifyAdminNewOrder,
  notifyPaymentConfirmed,
  notifyOrderShipped,
};
