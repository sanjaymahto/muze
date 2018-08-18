
import { makeElement, selectElement } from 'muze-utils';
import { cellSpanMaker } from './span-maker';
import {
    VIEW_INDEX, TOP, LEFT, RIGHT, BOTTOM, CENTER, HEIGHT, WIDTH, ROW_SPAN, COL_SPAN
} from '../enums/constants';
import { BLANK_BORDERS } from './defaults';

/**
 * Creates a table element of the layout
 *
 * @param {Object} mount Mount point for table elements
 * @param {string} className defines class name
 * @param {Array} rowData set of rows for the table
 * @return {Selection} set of selections for the table
 */
function renderTable (mount, className, rowData) {
    const table = makeElement(mount, 'table', ['layout'], `${className}-table`);
    const body = makeElement(table, 'tbody', ['layout'], `${className}-body`);
    const rows = makeElement(body, 'tr', rowData, `${className}-tr`);
    const cells = makeElement(rows, 'td', (d, i) => d.filter(e => e !== null).map(e =>
                                ({ placeholder: e, rowIndex: i })), `${className}-td`, {}, key => key.placeholder.id);

    return { table, body, rows, cells };
}

function applyRowBorders (cells, borderStyle, showBorders, color) {
    const style = `${borderStyle} ${showBorders ? color : BLANK_BORDERS}`;
    [TOP, BOTTOM].forEach((borderType) => {
        cells.style(`border-${borderType}`, style);
    });
}

function applyColBorders (cells, borderStyle, showBorders, color) {
    const style = `${borderStyle} ${showBorders ? color : BLANK_BORDERS}`;
    [LEFT, RIGHT].forEach((borderType) => {
        cells.style(`border-${borderType}`, style);
    });
}

/**
 * Applies borders to the cells in a matrix
 *
 * @param {Selection} cells Set of cells made from the matrix
 * @param {Object} border Border info for layout
 * @param {string} type Type of matrix(top/center/bottom)
 * @param {number} index Column index of matrix in the row
 */
function applyBorders (cells, border, type, index) {
    const {
        width,
        style,
        color,
        showRowBorders,
        showColBorders,
        showValueBorders
    } = border;
    const borderStyle = `${width}px ${style}`;

    if (type === CENTER && index === 1) {
        [TOP, BOTTOM, LEFT, RIGHT].forEach((borderType) => {
            cells.style(`border-${borderType}`, `${borderStyle} ${showValueBorders[borderType] ?
                color : BLANK_BORDERS}`);
        });
    } else if (type === CENTER) {
        applyRowBorders(cells, borderStyle, showRowBorders[index === 0 ? LEFT : RIGHT], color);
    } else if (index === 1) {
        applyColBorders(cells, borderStyle, showColBorders[type], color);
    }
}

/**
 * Renders a set of matrices in a row
 *
 * @param {Array} matrices Set of matrices in a row
 * @param {Selection} mountPoint Mount point for the row
 * @param {string} type top/center/bottom
 * @param {Object} dimensions dimensions of the matrix
 */
function renderMatrix (matrices, mountPoint, type, dimensions, classPrefix) {
    matrices.forEach((matrix, index) => {
        // Creating containers for each matrix individually
        const containerForMatrix = makeElement(mountPoint, 'div', [1], `${classPrefix}-grid-${type}-${index + 1}`)
        .classed(`${classPrefix}-grid-${type}`, true)
        .classed(`${classPrefix}-grid`, true)
        .style(WIDTH, `${dimensions.viewWidth[index]}px`);

        const {
            viewMatrix,
            spans
        } = cellSpanMaker(matrix, type, index);
        if (type !== CENTER) {
            containerForMatrix.style(HEIGHT, `${dimensions.viewHeight[VIEW_INDEX[type]]}px`);
        }

        // Rendering the table components
        const { cells } = renderTable(containerForMatrix, `${classPrefix}-grid`, viewMatrix);

        if (type === CENTER && spans) {
            cells.attr(ROW_SPAN, (cell, colIndex) => spans[cell.rowIndex][colIndex]);
        }
        else if ((type === TOP || type === BOTTOM) && index === 1) {
            cells.attr(COL_SPAN, (cell, colIndex) => {
                const span = spans[cell.rowIndex][colIndex];
                const placeholder = cell.placeholder;
                if (span > 1) {
                    placeholder.setAvailableSpace(0, placeholder.height);
                }
                return span;
            });
        }
        // Rendering content within placeholders
        cells.each(function(cell) {
            cell.placeholder && cell.placeholder.render(this);
        }).exit().each((cell) => {
            cell.placeholder && cell.placeholder.remove();
        });

        applyBorders(cells, dimensions.border, type, index);
    });
}

/**
 *
 *
 * @param {*} matrix
 * @param {*} start
 * @param {*} end
 */
const splitMatrices = (matrix, start, end) => matrix.map(arr => arr.slice(start, end));

/**
 * Renders all the matrices of the layout
 *
 * @export
 * @param {Array} matrices Set of matrices in the layout
 * @param {Array} mountPoints Mount points for each row of matrix
 * @param {Array} layoutDimensions Dimensions(height/width) of all the matrices
 */
export function renderMatrices (context, matrices, layoutDimensions) {
    const {
        top,
        center,
        bottom
    } = matrices;
    const {
        breakPage,
        gutterSpace,
        classPrefix
    } = context.config();
    const {
        width
    } = context.measurement();
    const mount = context.mountPoint();

    let newCenter = [];
    let newBottom = [];
    let newTop = [];

    const gutter = layoutDimensions.viewHeight[1] * gutterSpace.rows[breakPage.rows[0] - 1];
    const breakLength = breakPage.rows.length;

    if (breakPage.rows.length > 0 && Math.max(center[0].length, center[2].length) <= breakPage.rows[breakLength - 1]) {
        let prev = 0;
        const topBreak = top[1].length / breakLength;
        const bottomBreak = bottom[1].length / breakLength;
        breakPage.rows.forEach((e, i) => {
            newTop[i] = splitMatrices(top, i * topBreak, (i + 1) * topBreak);
            newCenter[i] = splitMatrices(center, prev, e);
            newBottom[i] = splitMatrices(bottom, i * bottomBreak, (i + 1) * bottomBreak);
            prev = e;
        });
    } else {
        newTop = [top];
        newCenter = [center];
        newBottom = [bottom];
    }
    makeElement(mount, 'div', newCenter, `${classPrefix}-stack-layout-container`)
                    .each(function(d, i) {
                        renderMatrix(newTop[i], selectElement(this), TOP, layoutDimensions, classPrefix);
                        renderMatrix(d, selectElement(this), CENTER, layoutDimensions, classPrefix);
                        renderMatrix(newBottom[i], selectElement(this), BOTTOM, layoutDimensions, classPrefix);
                    })
                    .style(WIDTH, `${width}px`)
                    .style('margin-bottom', (d, i) => {
                        if (i !== newBottom.length - 1) { return `${Math.floor(gutter)}px`; }
                        return 0;
                    });
}

/**
 * Creates the pagination arrows
 *
 * @param {Selection} mount Mount point for the arrows
 * @param {Array} data Data based on which the arrows are made
 * @param {string} arrowType Arrow type(left/right/top/bottom)
 * @param {Function} clickFn Click function to be bounded with the arrow
 * @return {Selection} the arrow element
*/
const createArrow = (mount, data, arrowType) => makeElement(mount, 'div', data, `table-arrow-${arrowType}`)
                .classed('table-arrow', true);

/**
 * Renders the arrows in the matrix
 *
 * @param {Selection} mountPoint point where arrows have to be mounted
 * @param {Object} viewMatricesInfo information on the view matrices based on which arrows are drawn
 * @param {Instance} layout instance of layout
 */
export const renderArrows = (context, mountPoint, viewMatricesInfo) => {
    const {
        columnPointer,
        rowPointer
    } = context.config();
    const {
        rowPages,
        columnPages
    } = viewMatricesInfo;
    // const arrowClick = context.arrowClick.bind(context);
    return {
        // bottom arrow
        bottom: createArrow(mountPoint, (rowPointer + 1 !== rowPages) ? [1] : [], BOTTOM),
        // render the top arrow based on row start index
        top: createArrow(mountPoint, (rowPointer > 0) ? [1] : [], TOP),
        // right arrow
        right: createArrow(mountPoint, (columnPointer + 1 !== columnPages) ? [1] : [], RIGHT),
        // render the left arrow based on row start index
        left: createArrow(mountPoint, (columnPointer > 0) ? [1] : [], LEFT),
    };
};
