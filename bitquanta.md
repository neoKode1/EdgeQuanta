# Superconducting Quantum Chip Measurement and Control System Communication Protocol

Origin Quantum  
February 10, 2026

## Table of Contents

1. Communication Protocol
2. Message Definitions (Router-Dealer Mode)
   1. Submit a Computing Task
   2. Query Task Status
   3. Return Computing Results
   4. Heartbeat Message
   5. Get Chip Calibration Time
   6. Get RB Experiment Data
   7. Get Chip Configuration Parameters
   8. Request Result for a Specific Task
   9. Set Exclusive Machine Time
   10. Release Exclusive Machine Time
3. Subscription Messages (PUB-SUB Mode)
   1. Task Status
   2. Chip Configuration Update Flag
   3. Chip Resource Status
   4. Automatic Calibration Start Message
   5. Automatic Calibration End Message
   6. Chip Maintenance Message
4. Type Definitions
   1. Task Status Types
   2. Error Code Types
5. Instruction Definitions
   1. Supported Basic Gate Types and Parameter Descriptions
   2. Instruction Format

## 1. Communication Protocol

The message format uses **ZeroMQ + JSON**.

ZeroMQ is a mature and efficient third-party communication library that makes it easy to implement efficient communication between C++ and Python programs.

ZeroMQ supports multiple working modes. Since the integration between the Sinan system and the measurement/control system is similar to a remote procedure call, the **request-reply model** is used here.

## 2. Message Definitions (Router-Dealer Mode)

### 2.1 Submit a Computing Task

**Purpose:** This message is used by the Sinan system to submit a computing task to the measurement/control system.

**Parameters:**
- `MsgType` (`String`): Required. Fixed value: `MsgTask`.
- `SN` (`Uint32_t`): Required. Message sequence ID.
- `TaskId` (`String`): Required. Task ID.
- `ConvertQProg` (`String`): Required. Quantum program; the instructions to be executed by the measurement/control system.
- `Configure.TaskPriority` (`Uint32_t`): Optional, default `0`. Task priority. Currently only two priority levels are supported: `0` (normal task), `1` (high priority).
- `Configure.Shot` (`Uint32_t`): Required. Number of repetitions. Valid range: `100` to `10000`. If out of range, the default is `1000`.
- `Configure.IsExperiment` (`Bool`): Optional. Whether experimental mode is enabled. `true`: experimental mode; `false`: non-experimental mode (normal user task). If omitted, it represents normal user task mode.
- `Configure.ClockCycle` (`Uint32_t`): Optional. Execution timing. Maximum circuit execution cycle, in microseconds. Sinan automatically decides whether to pass this parameter based on the maximum execution cycle returned by the measurement/control system.
- `Configure.PointLabel` (`Uint32_t`): Required. Factory/application label; tentatively set to `128`.

**Response:**
- `MsgType` (`String`): Required. Fixed value: `MsgTaskAck`.
- `SN` (`Uint32_t`): Required. Message sequence ID.
- `ErrCode` (`Uint32_t`): Required. Error code.
- `ErrInfo` (`String`): Conditionally required. May be empty if there is no error; must be non-empty if an error occurs.

### 2.2 Query Task Status

**Purpose:** Sinan sends this message to query the current status of a task. When Sinan does not receive results for a long time, it can use this message to prevent waiting indefinitely under abnormal conditions.

**Parameters:**
- `MsgType` (`String`): Required. Fixed value: `TaskStatus`.
- `SN` (`Uint32_t`): Required. Message sequence ID.
- `TaskId` (`String`): Required. Task ID.

**Response:**
- `MsgType` (`String`): Required. Fixed value: `TaskStatusAck`.
- `SN` (`Uint32_t`): Required. Message sequence ID.
- `TaskId` (`String`): Required. Task ID.
- `TaskStatus` (`Uint32_t`): Required. Task status. See the **Type Definitions** section.

### 2.3 Return Computing Results

**Purpose:** The measurement/control system returns computing results to the Sinan system.

**Parameters:**
- `MsgType` (`String`): Required. Fixed value: `MsgTaskResult`.
- `SN` (`Uint32_t`): Required. Message sequence ID.
- `TaskId` (`String`): Required. Task ID.
- `ProbCount` (`Int[]`): Required. Collapse counts; the count for each corresponding key.
- `NoteTime.CompileTime` (`Int`): Required. Compilation time in milliseconds.
- `NoteTime.PendingTime` (`Int`): Required. Queue waiting time in milliseconds.
- `NoteTime.MeasureTime` (`Int`): Required. Measurement time in milliseconds.
- `NoteTime.PostProcessTime` (`Int`): Required. Post-processing time in milliseconds.
- `ErrCode` (`Uint32_t`): Required. Error code.
- `ErrInfo` (`String`): Conditionally required. Error information.

**Response:**
- `MsgType` (`String`): Required. Fixed value: `MsgTaskResultAck`.
- `SN` (`Uint32_t`): Required. Message sequence ID.
- `ErrCode` (`Uint32_t`): Required. Error code.
- `ErrInfo` (`String`): Conditionally required. Error information.

> Note: In the example, quantum states are uniformly represented using hexadecimal strings.

### 2.4 Heartbeat Message

**Purpose:** Used to detect the connection status between the Sinan system and the measurement/control system. The measurement/control system maintains the service; Sinan actively sends a heartbeat packet, and the measurement/control side responds after receiving it.

**Parameters:**
- `MsgType` (`String`): Required. Fixed value: `MsgHeartbeat`.
- `SN` (`Uint32_t`): Required. Heartbeat sequence ID.
- `TimeStamp` (`Uint64_t`): Required. 64-bit timestamp in milliseconds.
- `ChipID` (`Uint32_t`): Required. Chip name/ID, for example `72`.

**Response:**
- `MsgType` (`String`): Required. Fixed value: `MsgHeartbeatAck`.
- `SN` (`Uint32_t`): Required. Heartbeat sequence ID.
- `backend` (`Uint32_t`): Required. Backend chip ID.
- `TimeStamp` (`Uint64_t`): Required. 64-bit timestamp in milliseconds.
- `Topic` (`String`): Required. Subscription topic.

### 2.5 Get Chip Calibration Time

**Purpose:** Used by the user to actively obtain the most recent calibration time for the chip from the measurement/control system.

**Parameters:**
- `MsgType` (`String`): Required. Fixed value: `GetUpdateTime`.
- `SN` (`Uint32_t`): Required. Message sequence ID.

**Response:**
- `MsgType` (`String`): Required. Fixed value: `GetUpdateTimeAck`.
- `SN` (`Uint32_t`): Required. Message sequence ID.
- `backend` (`Uint32_t`): Required. Backend chip ID.
- `LastUpdateTime.qubit` (`Uint32_t[]`): Required. Bit/qubit names corresponding to the calibration timestamps.
- `LastUpdateTime.timeStamp` (`Uint64_t[]`): Required. Corresponding calibration times as 64-bit millisecond timestamps.
- `ErrCode` (`Uint32_t`): Required. Error code.
- `ErrInfo` (`String`): Conditionally required. Error information.

### 2.6 Get RB Experiment Data

**Purpose:** Used by the user to actively obtain RB experiment data. Returned by the measurement/control system.

**Parameters:**
- `MsgType` (`String`): Required. Fixed value: `GetRBData`.
- `SN` (`Uint32_t`): Required. Message sequence ID.
- `ChipID` (`Uint32_t`): Required. Chip name/ID, for example `72`.

**Response:**
- `MsgType` (`String`): Required. Fixed value: `GetRBDataAck`.
- `SN` (`Uint32_t`): Required. Message sequence ID.
- `backend` (`Uint32_t`): Required. Backend chip ID.
- `SingleGateCircuitDepth` (`Uint32_t`): Required. Maximum circuit depth for single-gate RB experiments.
- `DoubleGateCircuitDepth` (`Uint32_t`): Required. Maximum circuit depth for two-gate RB experiments.
- `SingleGateFidelity` (`String`): Required. Single-qubit fidelity (string-encoded map/table).
- `DoubleGateFidelity` (`String`): Required. Two-qubit fidelity (string-encoded map/table).
- `ErrCode` (`Uint32_t`): Required. Error code.
- `ErrInfo` (`String`): Conditionally required. Error information.

### 2.7 Get Chip Configuration Parameters

**Purpose:** Obtain chip configuration parameters (JSON data), returned by the measurement/control system.

**Parameters:**
- `MsgType` (`String`): Required. Fixed value: `GetChipConfig`.
- `SN` (`Uint32_t`): Required. Message sequence ID.
- `ChipID` (`Uint32_t`): Required. Chip name/ID, for example `72`.

**Response:**
- `MsgType` (`String`): Required. Fixed value: `GetChipConfigAck`.
- `SN` (`Uint32_t`): Required. Message sequence ID.
- `backend` (`Uint32_t`): Required. Backend chip ID.
- `PointLabelList` (`Uint32_t[]`): Required. List of workspace modes currently supported by the chip.
- `ChipConfig` (`String`): Required. JSON string containing the chip configuration.
- `ErrCode` (`Uint32_t`): Required. Error code.
- `ErrInfo` (`String`): Conditionally required. Error information.

### 2.8 Request Result for a Specific Task

**Purpose:** Used when Sinan fails to correctly receive the computing result returned by the measurement/control system under abnormal conditions. In this case, Sinan actively requests the result for a specific task.

**Parameters:**
- `MsgType` (`String`): Required. Fixed value: `GetTaskResult`.
- `SN` (`Uint32_t`): Required. Message sequence ID.
- `TaskId` (`String`): Required. Task ID.

**Response:**
The returned result format is consistent with **Section 2.3 Return Computing Results**, but the `TaskResult` and `FidelityMat` fields are removed. Note that the message sequence number in the returned result must match the sequence number in the request message.

### 2.9 Set Exclusive Machine Time

**Purpose:** Used in specific scenarios where Sinan reserves exclusive machine time to ensure that tasks do not need to queue during the reserved period.

**Parameters:**
- `MsgType` (`String`): Required. Fixed value: `SetVip`.
- `SN` (`Uint32_t`): Required. Message sequence ID.
- `OffsetTime` (`Uint64_t`): Required. Offset from the current system time, in seconds.
- `ExclusiveTime` (`Uint64_t`): Required. Duration of the exclusive machine time, in seconds.

**Response:**
- `MsgType` (`String`): Required. Fixed value: `SetVipAck`.
- `SN` (`Uint32_t`): Required. Message sequence ID.
- `ErrCode` (`Uint32_t`): Required. Error code.
- `ErrInfo` (`String`): Conditionally required. Error information.

### 2.10 Release Exclusive Machine Time

**Purpose:** Used to release the exclusive machine time after the exclusive task computation is complete and restore normal mode.

**Parameters:**
- `MsgType` (`String`): Required. Fixed value: `ReleaseVip`.
- `SN` (`Uint32_t`): Required. Message sequence ID.

**Response:**
- `MsgType` (`String`): Required. Fixed value: `ReleaseVipAck`.
- `SN` (`Uint32_t`): Required. Message sequence ID.
- `ErrCode` (`Uint32_t`): Required. Error code.
- `ErrInfo` (`String`): Conditionally required. Error information.

## 3. Subscription Messages (PUB-SUB Mode)

### 3.1 Task Status

**Purpose:** When the task computation stage changes, the measurement/control system pushes real-time task status information.

**Operation:** Fixed value: `bytes: task_status`.

**Push message format:**
- `MsgType` (`String`): Required. Fixed value: `TaskStatus`.
- `SN` (`Uint32_t`): Required. Message sequence ID.
- `TaskId` (`String`): Required. Task ID.
- `TaskStatus` (`Uint32_t`): Required. Task status. See task status definitions.

### 3.2 Chip Configuration Update Flag

**Purpose:** After chip parameters change, the integrated measurement/control machine pushes a message indicating that Sinan can query the latest chip configuration through Router-Dealer mode.

**Operation:** Fixed value: `bytes: chip_update`.

**Push message format:**
- `UpdateFlag` (`Bool`): Required. Update indicator.
- `LastUpdateTime` (`Uint64_t`): Required. Last update time.

### 3.3 Chip Resource Status

**Purpose:** During task execution in multithreaded mode, whenever chip resources change (locked or released), the measurement/control service pushes detailed thread data to Sinan, including qubit usage for each service thread. QPilot may only need to focus on the `use_bits` field for each thread (`t0`, `t1`, `t2`, ...).

**Operation:** Fixed value: `bytes: probe`.

**Push message format:**
- `core_thread.t0` (`Object`): Required. Thread name of the measurement/control service.
- `core_thread.t0.use_bits` (`String[]`): Required. All qubits currently used by that thread.

### 3.4 Automatic Calibration Start Message

**Purpose:** When the integrated measurement/control machine performs automatic calibration, it pushes the calibrated qubit information to Sinan. During this period, the qubits under calibration are unavailable.

**Operation:** Fixed value: `bytes: calibration_start`.

**Push message format:**
- `qubits` (`String[]`): Required. Single-qubit information under calibration.
- `couplers` (`String[]`): Required. Couplers.
- `pairs` (`String[]`): Required. Qubit-pair information under calibration.
- `discriminators` (`String[]`): Required. Discriminators.
- `point_label` (`Int`): Required. Indicates which label the current calibration applies to.

### 3.5 Automatic Calibration End Message

**Purpose:** After calibration is completed, a completion message is pushed to Sinan and the qubits become available again.

**Operation:** Fixed value: `bytes: calibration_done`.

**Push message format:**
- `qubits` (`String[]`): Required. Calibrated single-qubit information.
- `couplers` (`String[]`): Required. Couplers.
- `pairs` (`String[]`): Required. Calibrated qubit-pair information.
- `discriminators` (`String[]`): Required. Discriminators.

### 3.6 Chip Maintenance Message

**Purpose:** Receives chip maintenance start and end notifications so that Sinan can automatically pause. If maintenance exceeds 2 hours, Sinan pushes a maintenance-offline notification to the cloud platform. If maintenance does not exceed 2 hours, only Sinan pauses while the cloud platform remains online.

**Operation:** Fixed value: `bytes: chip_protect`.

**Push message format:**
- `ProtectFlag` (`Bool`): Required. Maintenance flag. `true` means maintenance starts; `false` means maintenance ends.
- `DurativeTime` (`Uint64_t`): Required. Maintenance duration in minutes.
- `LastTime` (`Uint64_t`): Required. Timestamp.

## 4. Type Definitions

### 4.1 Task Status Types

| Status Code | Description |
|---|---|
| 0 | Unknown status |
| 1 | Task is still queued |
| 2 | Task is running |
| 3 | Corresponding task information not found |
| 4 | Task computation failed |
| 5 | Task computation completed |
| 6 | Task resent |
| 7 | Task is being compiled |
| 8 | Task compilation completed |

### 4.2 Error Code Types

| Error Code | Description |
|---|---|
| 0 | No error |
| 1 | Unknown error |
| 2 | Invalid computing task parameters |
| 3 | JSON error |
| 4 | Task queue full (returned when Sinan sends more than 200 tasks) |

## 5. Instruction Definitions

### 5.1 Supported Basic Gate Types and Parameter Descriptions

- `RPhi` (single-qubit gate)
  - `qubit` (`uint32_t`): target qubit
  - `axis` (`double`): rotation axis phase
  - `angle` (`double`): rotation angle `theta`
  - `order` (`uint32_t`): timing order
- `ECHO` (single-qubit gate)
  - `qubit` (`uint32_t`): target qubit
  - `order` (`uint32_t`): timing order
- `IDLE` (single-qubit gate)
  - `qubit` (`uint32_t`): target qubit
  - `delay` (`uint32_t`): delay, variable, affects timing of subsequent gates
  - `order` (`uint32_t`): timing order
- `CZ` (two-qubit gate)
  - `qubit` (`uint32_t`): target qubit
  - `ctrl` (`uint32_t`): control qubit
  - `order` (`uint32_t`): timing order

### 5.2 Instruction Format

The instruction format uses nested JSON arrays. The innermost gate object contains one of the basic gates described in Section 5.1 and its parameter list, plus a `Measure` gate object.

The basic gate format is:

`{"Gate": [Qubit..., other parameters..., execution order]}`

The `Measure` gate object format is:

`{"Measure": [[Qubit...], execution order]}`

A complete single-circuit instruction is generally a JSON array composed of multiple such basic gate objects and one `Measure` gate object:

`[{"Gate0": [...]}, {"Gate1": [...]}, ..., {"Gaten": [...]}, {"Measure": [[Qubit...], order]}]`

Since a task generally consists of instructions for multiple circuits, a complete task instruction is a collection of multiple such single-circuit instructions:

`[[{"Gate0": [...]}, ..., {"Measure": [[Qubit...], order]}], [...]]`

**Instruction example:**

`[[{"RPhi": [32, 270.0, 90.0, 0]}, {"RPhi": [33, 270.0, 90.0, 0]}, {"CZ": [32, 33, 30]}, {"RPhi": [33, 90.0, 90.0, 70]}, {"Measure": [[33, 32], 100]}], [{"IDLE": [32, 30, 0]}, {"Measure": [[32], 130]}], [{"RPhi": [33, 270.0, 90.0, 0]}, {"RPhi": [32, 180.0, 90.0, 100]}, {"Measure": [[33, 32], 130]}]]`