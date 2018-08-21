---
date: 2017-05-19T22:09:53
title: Activity Design Template
weight: 13
#menu:
#  main:
#    parent: Design Sketches
#    identifier: Tracking Diagrams
#    weight: 12
---

{{< viz >}}
digraph tracking {
  graph [splines=polyline,overlap=orthoxy];
  rankdir=LR;
  node[shape="box"]

  { rank=source; idle; }

  idle->runphase
  runphase -> tryphase
  record_phase -> idle;


 subgraph cluster_error {
  label="error flow"
  record_error;
  handle_error;
 }

 subgraph cluster_success {
  label="success flow"
  success;
  record_success;
 }

    tryphase-> success-> record_success;
    tryphase-> handle_error -> record_error;
    record_error -> tryphase;
    record_success,record_error -> record_phase;

}
{{< /viz >}}


{{< viz >}}

digraph disposition {
  rankdir=TB;
  node[shape=box]

  cycle->try_next_phase;
  subgraph cluster_cycle {

    record_cycle;
    try_next_phase;
    finish_cycle;

    label="cycle execution";
      maybe_continue_cycle;



    subgraph cluster_phase {
      label="phase execution"
      try_phase;
      record_phase;

      subgraph cluster_phase_error {
       label="exception";
       error; record_error; maybe_retry_phase;
      }

      subgraph cluster_phase_success {
       label="normal";
       success;
       record_success;
      }
  }
  try_next_phase -> try_phase;
  try_phase -> success -> record_success -> record_phase -> maybe_continue_cycle;
  maybe_continue_cycle -> try_next_phase;
  try_phase -> error -> record_error -> maybe_retry_phase -> record_phase;
  maybe_retry_phase -> try_phase;
  maybe_continue_cycle -> record_cycle -> finish_cycle;

  }
}
{{< /viz >}}

