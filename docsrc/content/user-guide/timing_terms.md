---
date: 2017-05-19T21:52:57
title: Timing Terms
weight: 11
menu:
  main:
    parent: User Guide
    identifier: timing-terms
    weight: 22
---

{{< note >}}
The terms in this section attempt to make useful contrasts while
staying reasonably close to established terms across the distributed computing
industry. They may be adjusted for accuracy or effect. If you have ideas or
suggestions for this, please submit change 
[request](https://github.com/engineblock/engineblock/issues).
{{</ note >}}

Often, terms used to describe latency can create confusion. In EngineBlock, 
the following terms will be used for consistency, as there are a few different 
conventions in use across the industry.

### wait time
 
**The duration of time between when an operation is intended to start and when it actually 
starts on a client.** This is also called *scheduling delay* in some places. Wait
time occurs because clients are not able to make all requests instantaneously.
There is an ideal time at which the request would be made according to user
demand. This ideal time is always earlier than the actual time in practice.
When there is a shortage of resources *of any kind* that delays a client request,
it must wait.

### transport time

**The duration of total time spent on a transport medium, or between client and server.** This is
sometimes called *wire time*. The transport time may include multiple segments or hops over
infrastructure, and includes the total time transporting the request and the response together.

### service time

**The duration of time it takes a server or other system to fully process to a request and 
send a response.** The service time does not include transport time. It is limited to what happens within 
a responding system after it receives the request and until it has submitted the response to the transport layer.

### latency

**The duration of time between when a client starts an operation and when the operation is complete,
including any transport time and service time.** Latency is a measure of time that lumps
together transport time and service time. From the client's perspective, there is no way to
measure transport time and service time independently.

### response time

**The duration of time a user has to wait for a response from the time they submitted the request.**
Response time is the duration of time from when a request was expected to start, to the time at 
which the response is finally seen by the user. A request is generally expected to start immediately
when users make a request. For example, when a user enters a URL into a browser, they expect the request
to start immediately when they hit enter. 

The response time can be calculated by adding the wait time, the transport time, and the service time.
  
## Timing, Visually

<div align="middle"><img src="/diagrams/eb_timing_terms.svg" width="50%"></img></div>

## Semantics 

### Resources

As shown, the client has to wait for some resource to become available before
an operation can be started. *This resource can be anything, including memory,
threads, sockets, or time, as enforced by artificial constraints like rate 
limits.* In this diagram, the resource is a general purpose place holder 
for anything that can cause delay before a request is started from a client.
This even includes process and IO scheduling systems as found within operating
systems.

### Generality
 
Further, the basic relationship that is shown here between a client entity, a 
transport layer, and a service entity is a general purpose abstraction. 
You can apply this view of timing to any messaging system in which you 
have those elements in play. For example, within a server, multiple subsystems 
are needed to fulfill a request. A server process will often need to wait for
sufficient IO capacity in the event of a cold read. In this case, the server
process becomes a client of the IO subsystem, with the IO scheduler acting
as arbiter of the request. You can simply change the terms on the diagram
to match such a scenario and it will still ring true.
