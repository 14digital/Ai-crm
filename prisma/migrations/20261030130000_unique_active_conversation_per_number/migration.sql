-- Prevent two concurrent webhook deliveries from racing to create duplicate
-- conversations for the same WhatsApp number (Meta sometimes delivers the
-- same inbound event twice within milliseconds).
CREATE UNIQUE INDEX "Conversation_active_clientWaNumber_key"
  ON "Conversation" ("clientWaNumber")
  WHERE status <> 'CLOSED';
