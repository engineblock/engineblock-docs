---
date: 2017-05-19T21:52:57
title: Coordinated Omission
weight: 11
menu:
  main:
    parent: User Guide
    identifier: coordinated-omission
    weight: 25
---

Coordinated omission is a term of art coined by Gil Tene. In practice, coordinated omission follows from the fact that all systems have finite concurrency and scheduling capacity, including the clients that test them. While the term doesn't cover all important aspects of scale and performance testing, it does put a focus on a particularly troublesome problem that often occurs with testing methods where effective concurrency is a meaningful limitation.

EngineBlock has specific features to help shed a light on the effects of coordinated omission. This section explains some of them, how they work, and how to use them. 

## Terms

Often, terms used to describe latency in the context of coordinated omission can create confusion. In this section the following terms will be used, as there are a few different conventions in use across the industry.

- scheduling delay - The time between when an operation is intended to start and when it actually starts on a client
- operational latency - The time between when an operation is started from the client, and when it is completed on the client.
- total response time - The user-centric measurement of latency which includes both scheduling delay and operational latency.
- service time - The time it takes a server or system to fully respond to a request and send a response.

As EngineBlock is a client-side tool, only the first two are directly observable: *delay* and *latency*. The third, *response* is calculated separately per operation. The reason for this will be made clearer below.

## C.O. Rate Controls

When rate limiting is enabled, the rate limiter is responsible for both limiting the start time of each operation, as well as metering how far the operations lag behind the ideal schedule. This is retained as a scheduling delay specific to each operation and added to any measurements of latency in order to arrive at an overall response time for each operation.

When the rate controls are enabled, you have to decide whether the scheduling delay measured by the rate limiter will be used in latency metrics. If you choose not to include the delay, then the latency metrics reported only measure operational latency. You can still observe the scheduling delay metric in this case in order to interpret the overall severity of scheduling delay by itself. If you choose to include the delay, then the latency metrics reported are effectively *response time* as defined above. In this mode, the per-op operational latency is lost in the mix.

There are reasons to measure either way, depending on the kind of testing you are doing. All systems have concurrency limitations and critical resource constraints. Also, systems are comprised of clients *and* servers with various concurrency models. Sometimes it is useful to see system behavior through a more conventional lens. 

