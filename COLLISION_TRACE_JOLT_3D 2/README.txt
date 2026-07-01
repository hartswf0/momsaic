COLLISION TRACE — JOLT 3D

START
Windows: double-click START_WINDOWS.bat
macOS: double-click START_MAC.command
Any system: open a terminal in this folder and run: python3 serve.py

Then open http://127.0.0.1:8080/

WHY A SERVER IS REQUIRED
JoltPhysics.js is a WebAssembly module. Browsers block local module loading from file:// pages. The included server keeps every dependency local and avoids internet/CDN failures.

CONTROLS
1. Drag the red brake ring along the east-west road.
2. Release to run seven actual Jolt counterfactual rollouts.
3. Tap the cyan car to run the selected branch.
4. During replay, grab the cyan car and drag sideways to add a steering correction.
5. After a run, drag the timeline or drag the road to rewind.
6. Drag the green lane edge to alter the cyclist route.
7. Drag empty space to orbit. Mouse wheel or two-finger pinch zooms.

ENGINE
Jolt Physics 1.0.0 owns rigid-body motion, friction, collisions, angular response, debris, and snapshot restoration. Three.js renders the Jolt body transforms.
