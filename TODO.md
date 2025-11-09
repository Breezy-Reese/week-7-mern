# TODO: Integrate MongoDB to Store Sent Messages

- [ ] Install mongoose dependency
- [ ] Create Message model/schema in models/Message.js
- [ ] Update server.js to connect to MongoDB using provided URI
- [ ] Modify 'send_message' socket event to save messages to DB
- [ ] Update 'send_file' socket event to save file messages to DB
- [ ] Update 'private_message' socket event to save private messages to DB
- [ ] Update 'react_to_message' socket event to update reactions in DB
- [ ] Update 'message_read' socket event to update read status in DB
- [ ] Update /api/messages route to fetch from DB with pagination
- [ ] Test the integration
