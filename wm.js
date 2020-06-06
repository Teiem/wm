"use strict";

const wm = (contentNode, {resizable = true, minWidth = 100, minHeight = 100, resizewidth = 12, zIndex = 0, snapDist = 10, blurPreviewBg = true} = {}) => {
    const windowNode = document.createElement("div");
    const resize = document.createElement("div");
    const preview = document.createElement("div");

    const _state = {
        windowIsMaximized: false,
        previewIsActive: false,
        isChanging: false,
    };

    const _NeedsUpdate = {
        preview: false,
        window: false,
    };

    let _windowData = {
        offsetX: 0,
        offsetY: 0,
        width: 0,
        height: 0,
    };
    
    const _startState = {
        x: 0,
        y: 0,
        relX: 0,
        relY: 0,
        width: 0,
        height: 0,
        isLeft: false,
        isRight: false,
        isTop: false,
        isBottom: false,
        isDragging: true,
    };

    let _nextPos = {
        offsetX: 0,
        offsetY: 0,
        width: 0,
        height: 0,
    };

    let _previewData = {
        offsetX: 0,
        offsetY: 0,
        width: 0,
        height: 0
    };

    let _updateScheduled = false;
    const _scheduleUpdate = () => {
        if (_updateScheduled) return;
        _updateScheduled = true;

        requestAnimationFrame(() => {
            _updateScheduled = false;
            
            _testBorder();
            _applyStyleWindow();
        })
    };

    const _applyStyleWindow = () => {
        windowNode.style.willChange = _state.isChanging ? "transform, width, height" : "";

        // does this cause some error?
        if (!_state.isChanging) return;

        preview.style.opacity = +_state.previewIsActive;
        if (_state.previewIsActive && _NeedsUpdate.preview) {
            _NeedsUpdate.preview = false;
            _setElPos(preview, _previewData, false);
            preview.classList.add("_wmPreviewTransition");
        }
        
        if (_state.windowIsMaximized) return;

        if (_startState.isDragging &&  !_NeedsUpdate.window) {
            _windowData.offsetX = _nextPos.offsetX;
            _windowData.offsetY = _nextPos.offsetY;

            _setElPos(windowNode, {offsetX: _windowData.offsetX, offsetY: _windowData.offsetY}, true);

        } else {
            _NeedsUpdate.window = false;

            const minWidthReached = _nextPos.width <= minWidth;
            const minHeightReached = _nextPos.height <= minHeight;

            const newWindowData = {
                width: minWidthReached ? minWidth :  _nextPos.width,
                height: minHeightReached ? minHeight :  _nextPos.height,
                offsetX: !_startState.isDragging && minWidthReached ? _startState.x - _startState.relX + _startState.width - minWidth : _nextPos.offsetX,
                offsetY: !_startState.isDragging && minHeightReached ? _startState.y - _startState.relY + _startState.height - minHeight : _nextPos.offsetY,
            }

            _windowData = {...newWindowData, isMaximized: false};
            _setElPos(windowNode, newWindowData, true);
        }
    };

    const _syncStyleWindow = () => {
        _setElPos(windowNode, _windowData, true);

        _nextPos = {..._windowData};
    };

    const _testBorder = () => {
        if (!_startState.isDragging) return;

        const borderTLBR = _getBorderTLBR();

        if (borderTLBR.top || borderTLBR.left || borderTLBR.bottom || borderTLBR.right) {
            if (!_state.previewIsActive) {

                preview.classList.remove("_wmPreviewTransition");
                _setElPos(preview, _windowData);

                // force reflow for transition
                void(preview.offsetHeight);
            }

            _previewData = {..._elWindowDataFromCorners(borderTLBR)};
            _state.previewIsActive = true;
            _NeedsUpdate.preview = true;

        } else {
            _state.previewIsActive = false;
        }
    };

    /*----- EventListeners -----*/

    

    const mouseDown = e => {
        _state.isChanging = true;
        _NeedsUpdate.window = true;
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", mouseUp, {once: true});
        
        if (_state.windowIsMaximized) {
            _state.windowIsMaximized = false;

            _startState.relX = (e.clientX - _previewData.offsetX / 100 * window.innerWidth) / (_previewData.width / 100 * window.innerWidth) * _windowData.width;
            _startState.relY = (e.clientY - _previewData.offsetY / 100 * window.innerHeight) / (_previewData.height / 100 * window.innerHeight) * _windowData.height;

        } else {
            _startState.relX = e.clientX - _windowData.offsetX;
            _startState.relY = e.clientY - _windowData.offsetY;

        }

        _startState.isDragging = true;        
    };

    const move = e => {
        _nextPos.offsetX = e.clientX - _startState.relX;
        _nextPos.offsetY = e.clientY - _startState.relY;

        _scheduleUpdate();
    };

    const mouseUp = e => {
        _state.isChanging = false;
        document.removeEventListener("mousemove", move);

        const borderTLBR = _getBorderTLBR();
        if (borderTLBR.top || borderTLBR.left || borderTLBR.bottom || borderTLBR.right) {
            _state.windowIsMaximized = true;
            _setElPos(windowNode, _elWindowDataFromCorners(borderTLBR), false);
        }
    };

    const resizeMouseDown = e => {
        _state.isChanging = true;
        document.addEventListener("mousemove", resizeMouseMove);
        document.addEventListener("mouseup", resizeMouseUp, {once: true});

        _startState.width = _windowData.width;
        _startState.height = _windowData.height;

        _startState.x = e.clientX;
        _startState.y = e.clientY;
        _startState.relX = e.clientX - _windowData.offsetX;
        _startState.relY = e.clientY - _windowData.offsetY;

        _startState.isTop = _startState.relY <= 0;
        _startState.isLeft = _startState.relX <= 0;
        _startState.isRight = _startState.relX >= _windowData.width;
        _startState.isBottom = _startState.relY >= _windowData.height;

        _startState.isDragging = false;
    };

    const resizeMouseMove = e => {
        const widthChange = e.clientX - _startState.x;
        const heightChange = e.clientY - _startState.y;

        if (_startState.isTop) {
            _nextPos.height = _startState.height - heightChange;
            _nextPos.offsetY = e.clientY - _startState.relY;

        }
        if (_startState.isRight) {
            _nextPos.width = _startState.width + widthChange;

        }
        if (_startState.isBottom) {
            _nextPos.height = _startState.height + heightChange;

        }
        if (_startState.isLeft) {
            _nextPos.width = _startState.width - widthChange;
            _nextPos.offsetX = e.clientX - _startState.relX;

        }

        _scheduleUpdate();
    };

    const resizeMouseUp = () => {
        _state.isChanging = false;
        document.removeEventListener("mousemove", resizeMouseMove);
    };

    const resizeMouseMoveHover = e => {
        const relX = e.clientX - _windowData.offsetX;
        const relY = e.clientY - _windowData.offsetY;

        const left = relX <= 0;
        const top = relY <= 0;
        const right = relX >= _windowData.width;
        const bottom = relY >= _windowData.height;

        if ((left && top) || (right && bottom)) {
            resize.style.cursor = "nwse-resize";
            
        } else if ((left && bottom) || (right && top)) {
            resize.style.cursor = "nesw-resize";

        } else if (left || right) {
            resize.style.cursor = "ew-resize";

        } else {
            resize.style.cursor = "ns-resize";

        }
    };

    /* ----- Util ----- */

    const _setElPos = (el, {offsetX, offsetY, width, height} = {}, absolute = true) => {
        if (offsetX != undefined || offsetY != undefined) el.style.transform = `translate(${offsetX}${absolute ? "px" : "vw"}, ${offsetY}${absolute ? "px" : "vh"})`;
        if (width != undefined) el.style.width = width + (absolute ? "px" : "vw");
        if (height != undefined) el.style.height = height + (absolute ? "px" : "vh");
    };

    const _elWindowDataFromCorners = ({left, right, bottom, top}) => ({
        width: left || right ? 50 : 100,
        height: bottom || top && (left || right) ? 50 : 100,
        offsetX: right ? 50 : 0,
        offsetY: bottom ? 50 : 0
    })

    const _getBorderTLBR = () => {
        const x = _nextPos.offsetX + _startState.relX;
        const y = _nextPos.offsetY + _startState.relY;

        return {
            left: x <= snapDist,
            top: y <= snapDist,
            right: x >= window.innerWidth - snapDist,
            bottom: y >= window.innerHeight - snapDist,
        };
    };

    /* ----- External/Initialization ----- */

    const _init = () => {
        const {left, top, width, height} = contentNode.getBoundingClientRect();
        _windowData.offsetX = left;
        _windowData.offsetY = top;
        _windowData.width = width;
        _windowData.height = height;
        _syncStyleWindow();

        /* Wrap */
        contentNode.parentNode.insertBefore(windowNode, contentNode);
        windowNode.appendChild(contentNode);
        contentNode.style.width = "100%";
        contentNode.style.height = "100%";

        contentNode.addEventListener("mousedown", mouseDown);

        windowNode.classList.add("_wm");
        windowNode.style.setProperty("--zIndex", zIndex);

        document.body.appendChild(preview);
        preview.classList.add("_wmPreview");
        if (blurPreviewBg) preview.classList.add("_wmPreviewBlurBg");

        /* Resize */
        if (!resizable) return;
        contentNode.parentNode.insertBefore(resize, contentNode);
        resize.classList.add("_wmResizer");
        windowNode.style.setProperty("--resizeWidth", resizewidth + "px");

        resize.addEventListener("mousemove", resizeMouseMoveHover);
        resize.addEventListener("mousedown", resizeMouseDown);
    };
    _init();

    return {
        // ...
    };
};

wm(document.getElementById("window"))