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

Coordinated omission is a term of art coined by Gil Tene. In practice,
coordinated omission follows from the fact that all systems have finite
concurrency and scheduling capacity, including the clients that test them. While
the term doesn't cover all important aspects of scale and performance testing,
it does put a focus on a particularly troublesome problem that often occurs with
testing methods where effective concurrency is a meaningful limitation.

EngineBlock has specific features to help shed a light on the effects of
coordinated omission. This section explains some of them, how they work, and how
to use them.

## Terms

{{< note >}}
The terms in this section attempt to make useful contrasts while
staying reasonably close to established terms across the distributed computing
industry. They may be adjusted for accuracy or effect. If you have ideas or
suggestions for this, please submit change 
[request](https://github.com/engineblock/engineblock/issues).
{{</ note >}}

Often, terms used to describe latency in the context of coordinated omission can
create confusion. In this section the following terms will be used, as there are
a few different conventions in use across the industry.

- scheduling delay - The time between when an operation is intended to start 
  and when it actually starts on a client
- operational latency - The time between when an operation is started from the 
  client, and when it is completed on the client.
- total response time - The user-centric measurement of latency which includes 
  both scheduling delay and operational latency.
- service time - The time it takes a server or system to fully respond to a 
  request and send a response.


As EngineBlock is a client-side tool, only the first two are directly
observable: *delay* and *latency*. The third, *response* is calculated
separately per operation. The reason for this will be made clearer below.

## C.O. Rate Controls

When rate limiting is enabled, the rate limiter is responsible for both limiting
the start time of each operation as well as metering how far the operations lag
behind the ideal schedule. This is retained as a scheduling delay specific to
each operation and added to any measurements of latency in order to arrive at an
overall response time for each operation.

When the rate controls are enabled, you have to decide whether the scheduling
delay measured by the rate limiter will be used in latency metrics or not. If
you choose not to include the delay, then the latency metrics reported only
measure operational latency. You can still observe the scheduling delay metric
in this case in order to interpret the overall severity of scheduling delay by
itself. If you choose to include the delay, then **specific** latency metrics
reported are effectively promoted to *response time* metrics as defined above.
In this mode, the per-op operational latency is lost in the mix.

In the EngineBlock documentation, metrics which can have this adjustment made
are called ***coordinated omission aware***. In general, any where you see a
configuration option with `co` in it, this represent the option of enabling a
total response metric that is coordinated omission aware, or converting a
latency metric to a response metric.

There are reasons to measure either way, depending on the kind of testing you
are doing. All systems have concurrency limitations and critical resource
constraints. Also, systems are comprised of clients *and* servers with various
concurrency models. Sometimes it is useful to see system behavior through a more
conventional lens.

## Using C.O. metrics

You can enable coordinated awareness in your metrics by using the following activity parameters:

- [striderate](/parameters/activity_params/#striderate)
- [cyclerate](/parameters/activity_params/#cyclerate)
- [phaserate](/parameters/activity_params/#phaserate)

These rate controls nest from the outside-in. The relationship between them is explained
in more detail under [Activity Params](/parameters/activity_params).

Setting a target rate for more than one of these at a time is not something that is
generally useful, since nested rates can become askew from each other unless they are
perfectly matched together in terms of counts and rates.

In general, simply add `,co` to the end of any rate specifier to ensure that it is enabled.
For example, `cyclerate=1000,0.0,co`. The second number in the rate specifier will be
a scheduling strictness control. For now, it is required to be `0.0`, which means burstable
average rate limiting. Still, the scheduling delay is included in the result as long as `,co`
is present. Alternately, you can use the `co_` prefix for the rate controls to achieve
the same effect, as in `co_cyclerate=1000`.

## Metric Names

When a rate limiter is set, the [cycles](/user-guide/standard_metrics/#cycles)
metric is becomes a total response time metric instead of simply an operational
latency metric. If you have an activity named "myactivity" by the
`alias=myactivity` parameter, then this metric will be named
`<prefix>.myactivity.cycles`, where the prefix is set by the metrics prefix
option. The same apples for the stride and phase metrics, using the same
conventions.

Additionally, there are two additional metrics that are reported for rate limiters:

- `<alias>.<stride|cycle|phase>.cco_delay_gauge` - A meter of the cumulative
  scheduling delay for an activity with the alias and the respective rate limiter
  level. Although this is a gauge, the scheduled delay that is added to latencies is calculated
  per-op.
  - example: `testactivity.cycle.cco_delay_gauge` is the cycle delay gauge for an activity with the alias
    'testactivity'.
- `<alias>.<stride|cycle|phase>.avg_targetrate_gauge` - This simply reports the intended average
  target rate for complete metric views in dashboards.
  
## Concurrency Model

Activity types can implement either a per-thread concurrency model or an asynchronous concurrency
model which allows threads to manage a number of simultaneous requests each. In practice, this can
be a factor for how many pending requests a client can put into flight. Async implementations generally 
have the ability to juggle a higher number of pending operations, as idle time on threads is reduced
as well as context switching that occurs when high thread counts are used to drive effective concurrency.

However, even asynchronous implementations have limits as to where blocking states can occur. Regardless
of whether your client-server system is synchronous or asynchronous, there will be a limitation of
how much work can be enqueued without going into a backlogging mode somewhere in the flow. It is
important to bear this in mind when interpreting coordinated omission results, as there is no simple
and universal remedy for resource contention at saturation. If you are not driving a saturating load
to the target system, and you are not blocking your client or server op rates by hitting 
concurrency limits, then there is little difference between the two concurrency models in terms of
measurement.

In effect, the coordinated omission awareness and the ability to have an asynchronous execution model
should be considered complimentary. If you want to use async activities, and the activity type supports
asynchronous operations, then you can enable it separately. Going forward, the convention for enabling
async on an activity that supports it will be the `async` parameter, which will be documented
in the respective activity type documentation.




    
    


 
 


