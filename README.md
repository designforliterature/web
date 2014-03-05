# Design for Literature
#### The MIT License (MIT)
#### Copyright (c) 2014 Ruben Kleiman

![Design For Literature](public/images/dfl-icon-250.png "Design For Literature")

Currently working on the first version (0.1.0). Aiming for a demo of some of the
features by April 7, 2014. (See *Roadmap*, below.)

About this project: http://designforliterature.com or <info@designforliterature.com>.

To contact Ruben Kleiman: <rk@post.harvard.edu>.

## Single-Machine, Development Installation

##### IMPORTANT: this is still under development, so it's not recommended that you install this. But if you do install it and encounter any problems getting the initial screen/page (not bugs!), please report them to me.

- Install (1) git, (2) latest nodejs, and (3) MongoDB 2.4.x
- Open a Unix shell and clone this git directory: git clone https://github.com/design4literature/web
- To start the DB server, execute the shell script web/scripts/start_db.sh. WHEN STARTING
IT FOR THE FIRST TIME, READ THE INSTRUCTIONS IN THIS SCRIPT FILE.
- To run the server, in a Unix shell cd to the cloned web directory and enter "node server.js"
- To run the client open a browser (preferably not IE) and enter http://localhost:3000
- To stop operations, you can Control-C or kill the node process and then Control-C or kill the DB process.

## HIRA Reference Implementation

The reference model is used to guide and evaluate the HIRA spec. The first
draft version of HIRA will be published by mid-2014.

All components communicate via a `RESTful` protocol.

When possible, a `RESTful` service is implemented in node.js/express. Clients are
implemented in `HTML5/CSS3/Javascript/Angularjs`. For more sophisticated
search and analytics, services will be provided in Scala/Finnagle and SOLR
(simply because nodejs doesn't have good implementations of some needed libraries).

We consider DBs as plugins. Initially, the reference implementation
uses `MongoDB` because it helps to do rapid development, though for
production reasons we will move to `HBase` or `Cassandra` within
a few months.

Most of the features implemented here are work-in-progress and until the version 0.1.0 release the system
is not intended to be used in production environments. However, it is available in this open
Github repository to provide transparency to and facilitate
communication with collaborators.

## Roadmap
- `April 7, 2014`: Demo milestone (see Demo Wishlist, below) (with an update available every other week thereafter).
- `Date TBD`: First release: 0.1.0

The demo milestone is a tool for showing some of the ideas while recruiting
volunteers and obtaining funding.

The first release is gated by volunteers and/or funding resources.

## Implementation Notes
### Web Socket and HTTP Connection Management

Sockets are cached on a per-session basis to permit access
to them in *any* context.

 Web socket connections are used in a variety of ways:
- To receive notifications from servers.
- To receive transaction completion messages from servers for long running transactions.
- To handle messaging within users of a "library" (a group of owners and editors of that library)
- To handle messaging in chat rooms.

 http responses and websocket messages bound to clients are JSON objects
 with the following fields:
- `type` := A string code indicating whether the transaction was successful or not.
- `msg` := A readable message indicating the specific error. This is only used for debugging at present.

**Types**:

- `fatal`:     A fatal server-side system error. The message is for debugging use only; clients
            should be given an appropriate, simple message. The message should be logged
            to the console to facilitate client-side debugging.

- `trans`:     A possibly transient server-side system error. The message is for debugging use only; clients
            should be told that they should try the operation again or later. The message should be logged
            to the console to facilitate client-side debugging.

- `error`:     An error for the client. The client should present the message as an error notification
            to the user who may need to take some corrective action. The message should be logged
            to the console to facilitate client-side debugging.

- `warn`:      A warning for the client. The client may present the message payload
            as a warning notification.

- `ack`:       An acknowledgement that a socket transaction or any other http request has succeeded.

- `note`:      A note for the client. The client may present the message as an
            informational notification.

Server-side, thrown errors must have a type and msg field (as usual).
All errors of type 'fatal' and 'trans' must be caught and logged; all
other errors must be delivered to the client through the notification
or some other client-facing mechanism.

### Database

Values all stored as strings for now to simplify migration to other DBs
and to use DBs as plugins. To facilitate prototyping the first version,
we're now using `MongoDB` and will migrate to `HBase` or `Cassandra` at a later time.

### Backend

The backend will eventually consist of a distributed queue (e.g., `Kafka`) feeding
into various processes--some of them implemented in `Storm`.

### Demo Wishlist
- Create and update catalog items
- Upload content
- Search catalog
- Browse poems
- Annotate poems (simple and complex annotation, citation, dictionary lookup)
- libraries with permissions, users, catalogs and content copies, etc.
  (not necessary for demo but would be nice: libraries are distributed (library comm protocol))
