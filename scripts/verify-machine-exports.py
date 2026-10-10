"""Independent DST decoding and PES conversion. Requires pyembroidery==1.5.1."""
import collections
import json
from pathlib import Path
import pyembroidery as embroidery

root = Path('artifacts/symbiosis-stitches')
results = []
for path in sorted(root.glob('*.dst')):
    pattern = embroidery.read_dst(str(path))
    report = json.loads(path.with_name(path.stem + '-report.json').read_text())
    counts = collections.Counter(s[2] & embroidery.COMMAND_MASK for s in pattern.stitches)
    assert counts[embroidery.STITCH] == report['stitchCount'], path
    assert counts[embroidery.COLOR_CHANGE] == report['colorChanges'], path
    assert pattern.stitches[-1][2] & embroidery.COMMAND_MASK == embroidery.END
    sewn = [s for s in pattern.stitches if s[2] & embroidery.COMMAND_MASK == embroidery.STITCH]
    bounds = [min(s[0] for s in sewn)/10, min(s[1] for s in sewn)/10,
              max(s[0] for s in sewn)/10, max(s[1] for s in sewn)/10]
    assert abs(bounds[2]-bounds[0]-report['stitchedBoundsMm']['width']) < .001
    assert abs(bounds[3]-bounds[1]-report['stitchedBoundsMm']['height']) < .001
    # DST does not encode thread colours: restore the exported sequence before PES writing.
    pattern.threadlist = []
    for color in report['threadSequence']:
        pattern.add_thread(color)
    pes_path = path.with_suffix('.pes')
    embroidery.write_pes(pattern, str(pes_path), {'version': 6})
    back = embroidery.read_pes(str(pes_path))
    pes_counts = collections.Counter(s[2] & embroidery.COMMAND_MASK for s in back.stitches)
    assert pes_counts[embroidery.STITCH] == report['stitchCount'], pes_path
    assert pes_counts[embroidery.COLOR_CHANGE] == report['colorChanges'], pes_path
    result = dict(file=path.name, stitches=counts[embroidery.STITCH],
                  colorChanges=counts[embroidery.COLOR_CHANGE], boundsMm=bounds,
                  reader='pyembroidery 1.5.1', pesFile=pes_path.name,
                  pesStitchCount=pes_counts[embroidery.STITCH], productionRelease=False)
    results.append(result)
print(json.dumps(results, indent=2))
(root/'independent-file-verification.json').write_text(json.dumps(results, indent=2))
