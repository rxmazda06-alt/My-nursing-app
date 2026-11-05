"""Usage: add_manifest.py manifest.json 'seg:sessA,sessB:genA,genB' ..."""
import json, sys
p = sys.argv[1]; m = json.load(open(p))
for arg in sys.argv[2:]:
    seg, sess, gens = arg.split(":")
    m["segments"][seg] = {"sessions": sess.split(","), "gens": gens.split(",")}
json.dump(m, open(p, "w"), indent=1)
print("segments recorded:", len(m["segments"]))
