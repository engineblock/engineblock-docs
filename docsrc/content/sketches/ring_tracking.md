---
date: 2017-05-19T22:09:53
title: Ring Tracking
weight: 13
#menu:
#  main:
#    parent: Design Sketches
#    identifier: Tracking Diagrams
#    weight: 12
---

This schematic is an attempt to explain a very basic pattern. It really is a
simple pattern, but it sometimes helps to have visuals to get newer users
grounded in the concepts.

## Why Ring Tracking?

The tracking mechanisms in EngineBlock serve two purposes:

1. To coordinate cycle number dispatch between collaborating activities.
2. To coordinate cycle result values between enhanced activities that know how to use them, or for intermediate cycle number filters that scrutinize the result codes provided by an upstream activity.

Since both of these need to sometimes support multiple values being dispatched
per iteration, the existing concurrent primitives like blocking queues, etc.
don't suffice. We need to allow upstream activities to mark result codes without
serial blocking when possible, and we need to let downstream activities consume
values with as little blocking as possible.

That said, the goals are generally to avoid locks and use atomics where
possible, falling back to locking modes only where absolutely necessary. Ring
Tracking is a basic ring-buffer approach that allows for the marking and reading
of tracking data between two collaborating activities.

Ring Tracking  

{{< viz >}}
digraph ringtracking {
 node[fontsize=10,shape=circle];
 
 subgraph buffer {
  title="buffer"; label="buffer"; labeljust="l"; labelloc="top";
  comment="foo";
  ranksep=0.1; rank=same; edge[color="blue"]; node[color="blue"; fontcolor="blue";];
  legend0[shape="none"; label="bufferpos"] legend0->0[arrowhead="none";style="dotted"];
  0->1->2->3->4->5->6->0
 }
 subgraph cycle {
  title="cycle";
  ranksep=0.1;rank=same;edge[color="orange"];node[color="orange";fontcolor="orange";];
  legend1[shape="none"; label="cyclenum";]; legend1->18[arrowhead="none";style="dotted"]
  18[label="..."] 26[label="..."] 19[label="-1"]
  20[tooltip="pending",color="black",fontcolor="black"]
  25[tooltip="marking",color="black",fontcolor="black"]
  18->19->20->21->22->23->24->25->26
 }
 subgraph values {
  ranksep=0.1; rank=same; node[color="yellow",shape="circle"]; edge[color="yellow"];
  node[label="0"] v1[label="0"] v2[label="1"] v3[label="101"] v4 v5 v6
  v7[label="3"]
  edge[arrowhead="none"] v1->v2->v3->v4->v5->v6->v7
  
 }

 subgraph pointers {
  node[shape="box",rank=same] edge[arrowhead="none"]
  pending->1 marking->6
 }
 
 subgraph links {
  19->v1 20->v2 21->v3 22->v4 23->v5 24->v6 25->v7
  0->19 1->20 2->21 3->22 4->23 5->24 6->25
 }

}
{{< /viz >}}

<font color="blue">
The bufferpos level shows the actual offset within the cycle
result buffer, in blue. In this example, the buffer can only hold eight
positions. The buffer logically wraps back around.
</font>

<font color="orange"> The cyclenum level shows the buffer position translated to
a sub interval of a larger cycle range. The cycle range could be any positive
interval within the bounds of 0 and Long.MAX_VALUE. The cycle positions do not
wrap as the buffer does, but each active cycle position corresponds to one
buffer position. </font>

The pending and marking pointers show the current position of the next read and
write, respectively. The number of available cycles to dispatch atomically is
equal to the difference between the marking position and the pending position.
When marking==pending, no cycles are available.
 
The pending and marking positions are tracked in terms of cycles, not buffer
position. All buffer positions derived from the cycle number using buffer size
modulo. Still, the important invariants are enforced on the cycle level,
preventing andy under or over ranging on the buffer.

### Marking Cycle Values
{{< flowchart >}}
st=>start: Start
rangecheck=>subroutine: rangecheck
awaitmarkable=>subroutine: await
 markable
windowfull=>condition: Window Full?
docas=>subroutine: calculate & 
 apply CAS
casapplied=>condition: CAS applied?
signalreadable=>subroutine: Notify
 readable
en=>end: End


st->windowfull
windowfull(yes,right)->awaitmarkable
awaitmarkable(right)->windowfull
windowfull(no)->docas->casapplied(yes)->signalreadable->en
casapplied(no)->windowfull
{{< /flowchart >}}

When a reader requests a number of cycle values, it first checks whether or not
there is a sufficient range between the current pending and marking values. If
so, it calculates the CAS operation needed in order atomically move the pending
pointer up by the size of the request (stride). If this operation succeeds, then
a cycle segment is created from the marked values in the range between the
previous pending and marking pointers *after* the pending value is updated.
Because this could possibly create a buffering race condition, the buffer is
required to be large enough to prevent a full wrap-around between the data read
by pending threads and the marker data written by marking threads. 

When the read operation succeeds, markers who were waiting on a "can write"
semaphore are signalled by the reader thread before returning to the caller.

If this read operation fails, the check is repeated and the process attempted
again. This process repeats until either advancing the pending marker succeeds, or the
precondition check fails. If the precondition check fails, (there are not enough
data to fulfill the request) then the reader blocks on a semaphore awaiting a
notification from a marker.

When a marker attempts to mark a cycle, it checks whether or not the pending
position is advanced sufficiently to allow the marker window to shift. If so,
the values are marked and the window shifted. Readers awaiting a "can read"
signal are also notified. If not, the marker enters a similar retry cycle to
that of the reader, blocking on a "can write" condition.

As a sanity check condition, all values are initialized to -1 when the marker window moves over them. Values behind the marker window are still active for reads. This means that the buffer size is required to be at least 2x the marker window size in order to avoid a wrap-around race condition. Further, the marker window must be at least a large as the largest stride that may be requested.

### Invariants

1. buffer size > window size * 2
2. marker position <= pending position + window size
3. 0 <= min < max <= Long.MAX_VALUE
4. min <= pending <= marking <= max

### Errors

1. Requesting a stride larger than the window size
2. Marking a cycle prior to pending
3. Unable to CAS from -1 to cycle value

