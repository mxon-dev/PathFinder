# Public Data Forest Trails Dataset

## 10.4 Korea Forest Service Forest Service and 둘레길 Information

### Purpose

- Supplement `mountain`, forest trail, and 둘레길 type candidates
- Display map Polylines if GPX or SHP files are available
- Many courses are longer than typical walks — use with care for sub-30-minute recommendations

### Fields to Use

| Source Field | Normalized Field | Description |
|---|---|---|
| dullegilvia | `raw.via` | Waypoints |
| dullegilintro | `description` | Introduction |
| dullegildetailintro | `raw.detailIntro` | Detailed introduction |
| dullegildistance | `distanceKm` | Distance |
| dullegiltime | `durationMin` | Duration |
| dullegilgpx | `raw.gpxUrl` | GPX file |
| dullegilshp | `raw.shpUrl` | SHP file |
| dullegilsections | `start.name` | Start section |
| dullegilsectione | `end.name` | End section |

### Usage Rules

```txt
1. If a GPX URL is available, parse the GPX to generate path coordinates
2. SHP is not required in MVP
3. Exclude courses with duration over 90 minutes from default recommendations
4. Show these preferentially only when the user selects mountain/forest trail filter
5. Classify courses with very long distance and duration as "long-distance courses"
```
