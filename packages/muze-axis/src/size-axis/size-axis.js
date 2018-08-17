/**
 * @module Axis
 * This file declares a class that is used to render an axis to add  meaning to
 * plots.
 */
import { interpolateArray, getUniqueId, generateGetterSetters } from 'muze-utils';
import { createScale, } from '../scale-creator';
import { DEFAULT_CONFIG } from './defaults';
import { SIZE, ORDINAL, CONTINOUS, DISCRETE } from '../enums/constants';
import { strategyGetter } from './size-strategy';
import { PROPS } from './props';

/**
* This class is used to instantiate a SimpleAxis.
* @class SimpleAxis
*/
export default class SizeAxis {

    /**
     * Creates an instance of SimpleAxis.
     * @param {Object} config input parameters.
     * @memberof SizeAxis
     */
    constructor (config) {
        generateGetterSetters(this, PROPS);

        this._id = getUniqueId();
        this._config = Object.assign({}, this.constructor.defaultConfig(), config);

        this._domainType = this._config.type === 'linear' ? CONTINOUS : DISCRETE;
        this._rangeType = (this._config.interpolate || this._config.type !== 'linear') ? CONTINOUS : DISCRETE;

        this._sizeStrategy = this.setStrategy(this._domainType, this._rangeType);
        this._scale = this.createScale(this._sizeStrategy);
        this._range = this._config.range;

        this.updateDomain(config.domain);
    }

     /**
     *
     *
     * @param {*} domainType
     * @param {*} rangeType
     * @param {*} schemeType
     * @returns
     * @memberof ColorAxis
     */
    setStrategy (domainType, rangeType) {
        const { intervals } = this.config();

        return strategyGetter(domainType, rangeType, intervals);
    }

    /**
     *
     *
     * @returns
     * @memberof SizeAxis
     */
    createScale (strategy) {
        const {
            range
        } = this.config();
        return createScale({
            type: strategy.scale,
            range,
        });
    }

    /**
     *
     *
     * @static
     * @returns
     * @memberof ColorAxis
     */
    static defaultConfig () {
        return DEFAULT_CONFIG;
    }

     /**
     *
     *
     * @static
     * @returns
     * @memberof ColorAxis
     */
    static type () {
        return SIZE;
    }

    /**
     *
     *
     * @param {*} domainVal
     * @returns
     * @memberof SizeAxis
     */
    getSize (domainVal = 0) {
        let sizeVal = 1;
        const {
            scaleFactor,
            value
        } = this.config();
        const scale = this.scale();
        const domain = this.domain() || [1, 1];

        if (!scale || domain[0] === domain[1]) {
            sizeVal = value;
        } else {
            return this._sizeStrategy.range(domainVal, scale, this.domain(), this.uniqueValues()) * scaleFactor;
        }
        return sizeVal * scaleFactor;
    }

    /**
     * This method is used to assign a domain to the axis.
     *
     * @param {Array} domain the domain of the scale
     * @memberof SizeAxis
     */
    updateDomain (domain) {
        if (domain) {
            const domainFn = this._sizeStrategy.domain;

            const domainInfo = domainFn(domain, this.config().intervals);

            this.domain(domainInfo.domain);
            this.uniqueValues(domainInfo.uniqueVals);

            this.scale().domain(domainInfo.scaleDomain || this.domain());
        }
        return this;
    }

    /**
     *
     *
     * @returns
     * @memberof SizeAxis
     */
    getScaleFactor () {
        return this.config().scaleFactor;
    }

    /**
     * This method returns an object that can be used to
     * reconstruct this instance.
     *
     * @return {Object} the serializable props of axis
     * @memberof ShapeAxis
     */
    serialize () {
        return {
            type: this.constructor.type(),
            scale: this.scale(),
            domain: this.domain(),
            range: this.range(),
            config: this.config()
        };
    }

    /**
     * Returns the id of the axis.
     * @return {string} Unique identifier of the axis.
     */
    id () {
        return this._id;
    }
}
