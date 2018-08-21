---
date: 2017-05-19T22:09:53
title: Tracking Diagrams
weight: 13
#menu:
#  main:
#    parent: Design Sketches
#    identifier: Tracking Diagrams
#    weight: 12
---

This section lays out visually some of the design challenges in the cycle
tracking design. The diagrams are very basic, but serve as a basis for
discussion and elaboration.

## Scenario: A -> B

{{< viz >}}
digraph sys1 {
 rankdir=LR;
 node[shape=box]
 edge[dir=out]
 state[label="Internal state"];
 
 A -> marker;
 marker -> state;
 state -> tracker;
 tracker -> B;
}
{{< /viz >}}

## Internal State

{{< viz >}}
digraph d {
a[shape="record",label="0|1|2|3|4|5|6|7|8|9|10|11|..."];
}
{{< /viz >}}


### Pacing Data Only

For pacing purposes, in which a consuming tracker watches the state of a
producing marker, the only state that is necessary to record is whether a given
cycle has been completed. Ostensibly, in this mode the API only needs to support
the enumeration of a cycle, and not its status. However, since cycles can
complete in any order, and we do not want to force sequential serialization (as this
would be a tremendous deoptimization of concurrent performance), the ability
to pace cycles independently needs to be supported within some bound.
In this case, the binary state for each cylce only represents whether or not
it has been marked as completed. Uncompressed, this requires exactly one logical
bit per cycle, however the implementation may do something else internally.

{{< viz >}}
digraph d {
a[shape="record",label="<0>0|<1>1|<2>2|<3>3|<4>4|<5>5|<6>6|<7>7|<8>8|<9>9|..."];
b[shape="record",label="<0>0|<1>1|<2>0|<3>0|<4>1|<5>1|<6>1|<7>0|<8>1|<9>0|..."];
a:0->b:0; a:1->b:1; a:2->b:2; a:3->b:3; 
a:4->b:4; a:5->b:5; a:6->b:6; a:7->b:7;
a:8->b:8; a:9->b:9;
}
{{< /viz >}}

### Marking Data Too

When recording some additional state, including an enumerable outcome, it is necessary
to associate a value with each cycle completion. We are planning to allow these values
to be in the range of 1..127, inclusive. The zero value will be reserved to mean
*unmarked*, or in effect *incomplete*. In the example below, cycle 7 has not been marked
yet.

{{< viz >}}
digraph d {
a[shape="record",label="<0>0|<1>1|<2>2|<3>3|<4>4|<5>5|<6>6|<7>7|<8>8|<9>9|..."];
b[shape="record",label="<0>8|<1>4|<2>1|<3>1|<4>4|<5>4|<6>8|<7>0|<8>9|<9>123|..."];
a:0->b:0; a:1->b:1; a:2->b:2; a:3->b:3; 
a:4->b:4; a:5->b:5; a:6->b:6; a:7->b:7;
a:8->b:8; a:9->b:9;
}
{{< /viz >}}


## Segmenting State

When using buffered counting to track completion of a range of cycle values, it
is necessary to break the number line into a set of uniformly sized intervals.
This allows for modulo-style assignment of a cycle number to a marking bucket.
For example, if you were tracking full completion of every 8 cycles in a bucket,
then you would break the cycles into logical units like this, with a simple "mod
8" operation, which is also equivalent to masking off all but 3 LSBs.

{{< viz >}}
digraph d {
rankdir=LR;
0[shape="record",label="{0|1|2|3|4|5|6|7}"];
1[shape="record",label="{8|9|10|11|12|13|14|15}"];
2[shape="record",label="{16|...}"];
0->1;
1->2;
}   
{{< /viz >}}

In this case, it is possible to efficiently pace each segment as a unit, by
allowing for efficient concurrent counting algorithms to operate exclusively on
the segment state without exposing it yet to the reader side.

## Stride and Filtering

When using cycle stride of greater than 1, a strategy that causes a number of
cycles to be processed within each thread, filtering may become a challenge.
This is because you may want the same type of operational grouping within a downstream
thread as you have in an upstream thread.

Here is the current flow of stride, as managed by a thread harness (AKA a Motor
in EngineBlock parlance), an input, and an action:

{{< jssequence >}}
Motor->Input: get[stride=5]
Input->Motor: startsat=25
Note over Motor: foreach v in [25,30)\n(contiguously)
Motor->Action: runCycle(v)
Action->Motor: result
{{< /jssequence >}}

That means that any filtering needs to be applied at the motor level, after
applying stride, but before providing the cycles to the Action. This is also in
keeping with the desire to avoid injecting inter-activity flow logic into the
programming scope of individual activities.

The revised *stride & filter* scenario looks like this:

{{< jssequence >}}
Motor->Input: get[stride=5]
Input->Motor: startsat=25
Note over Motor: foreach v in [25,30)\n(matching filter)
Motor->Action: runCycle(v)
Action->Motor: result
{{< /jssequence >}}


## Tracking Highest Contiguous

When marking an array, when cycles can complete out of order, it is useful to track
the highest contiguous value that has been completed. To do this efficiently, CAS
can be employed to do an almost free "pull up" to the current value when the most
max contiguous value was already one less than the current marking cycle.
This does not, however, handle the case of fast-forwarding the contiguous count
according to cycles that have already been marked. Also, because the bytebuffer is
not atomic or volatile itself, a more resilient check needs to be added to the
max contiguous property that will eagerly update when asked.

## Implementation Sketch

![Tracking Extent](/diagrams/cycle_tracking.png#center)

This diagram shows a series of tracking extents. Each one is simply a buffer of
result codes.

### Locking and Signals

Locking should be kept to a minimum. The only time locks should be used at all
is when there is a blocking state that would otherwise consume resources in an
idle loop, and for which there is a proper and coherent signaling scheme
available.

- nowMarking signal should be set any time a new extent is added.
   
### Marking

When a marker attempts to mark a cycle of an extent:

1. Mark the correct and active extent if possible.
2. If the marked extent was completed, attempt to activate a serving extent, but only
   if the serving extent was not set (atomically). If succesful, signal nowServing.
3. If the marked extent was completed, add another extent and signal nowMarking.
4. If an active extent was marked, return success
5. Add an extent, if the the maxExtents limit is not reached.
6. If an extent was added, retry request.
7. If an extent was not added, block for nowMarking state, when signaled, retry request.

### Reading

When a reader attempts to read a segment of an extent:
1. Acquire the serving extent. 
2. If the serving extent is not defined, then block awaiting nowServing state.
3. If all cycles are consumed from the current extent, then advance the servingExtent
   if possible.
4. When a serving extent is advanced, then signal nowMarking, in case  extent limit
   opens up new marking extents.


The important details are as follows:

1. No extent may be read from by a consumer until it has been fully filled.
2. The only extent that may be read from at any one time is the serving extent.
   That is the lowest extent that has been filled and not fully served.
3. Lock-free readers and writers 
3. A fixed number of extents is maintained at all times.
4. It is still up to the consumer of cycle codes to determine when to stop reading
   cycles.

=======
## Performance Strategies

1. Track the highest contiguous completed cycle as well as the highest completed cycle.
   allowing for fine-grained queries on state only if they are the same.
2. Use CAS or LongAdder for counters. For CAS, observing the return value can be used as
   an incrementing state tracker for contiguity. For example, a successful CAS +1 operation
   represents a succesful advance to the current position, and a failed one represents
   that the "highest" value was not at the right position to advance.


