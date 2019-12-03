(function(){
        
    var attrArray = ["Social Democratic", "Moderate", "Swedish Democratic", "Center", "Left", "Christian Democratic", "Liberal", "Green", "Feminist", "Other"];
    
    var expressed = attrArray[0];

    window.onload = setMap();
    
    function setMap() {
        
        var width = window.innerWidth * 0.40,
            height = 600;
    
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);
                
    
        var projection = d3.geoAlbers()
            .center([0, 62])
            .rotate([-17, 0, 0])
            .parallels([45, 25])
            .scale(2500)
            .translate([width / 2, height / 2]);
    
        var path = d3.geoPath()
            .projection(projection);
    
        d3.queue()
            .defer(d3.csv, "data/riksdag.csv")
            .defer(d3.json, "data/countries.topojson")
            .defer(d3.json, "data/valkretsar.topojson")
            .await(callback);
    
        function callback(error, csvData, countries, provinces) {
        
            setGraticule(map, path);
            
            var countriesData = topojson.feature(countries, countries.objects.countries);
        
            var provinceData = topojson.feature(provinces, provinces.objects.valkretsar).features;
        
            provinceData = joinData(provinceData, csvData);
            
            setPlot(csvData);
           
            var colorScale = createColorScale(csvData);
            setEnumerationUnits(provinceData, countriesData, map, path, colorScale);
            
            createDropdown(csvData);
        
        };
        
    };
         
    function setGraticule(map, path){
    
        var graticule = d3.geoGraticule()
            .step([10, 10]);
        
        var gratBackground = map.append("path")
            .datum(graticule.outline())
            .attr("class", "gratBackground")
            .attr("d", path);
        
        var gratLines = map.selectAll(".gratLines")
            .data(graticule.lines())
            .enter()
            .append("path")
            .attr("class", "gratLines")
            .attr("d", path);
        return;
    };
    
    function joinData(provinceData, csvData){
        for (var i=0; i<csvData.length; i++) {
            var csvState = csvData[i];
            var csvKey = csvState.NAME;
            
            for (var a=0; a<provinceData.length; a++) {
                var geojsonProps = provinceData[a].properties;
                var geojsonKey = geojsonProps.NAME;
                
                if (geojsonKey == csvKey){
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvState[attr]);
                        
                        geojsonProps[attr] = val;
                    });
                };
            };
           
        }; 
        
        return provinceData;
    };
    
    function setEnumerationUnits(provinceData, countriesData, map, path, colorScale){
        var countriesMap = map.append("path")
            .datum(countriesData)
            .attr("class", "countries")
            .attr("d", path);
        
        var provinceMap = map.selectAll(".provinceMap")
            .data(provinceData)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "provinceMap " + d.properties.NAME;
            })
            .attr("d", path)
            .style("fill", function(d){
                return choropleth(d.properties, colorScale);
            })
            .on("mouseover", function(d){
                highlight(d.properties);
            })
            .on("mouseout", function(d){
                dehighlight(d.properties);
            });
        
        var desc = provinceMap.append("desc")
            .text('{"stroke": "#FFF", "stroke-width": "0.25px"}');
        
        return;
    }; 
    
    function setPlot(csvData){
        var plot = d3.select("body")
            .append("svg")
            .attr("class", "plot")
            .attr("width", 400)
            .attr("height", 500)
            .append("g")
            .attr("transform", "translate(40, 50)");
    
        console.log(csvData);        
    
        return;
        
    };
    
    function createColorScale(data){
        var colorClasses = [
            "#9ECAE1",
            "#6BAED6",
            "#4292C6",
            "#2171B5",
            "#084594"
        ];
        
        var colorScale = d3.scaleThreshold()
            .range(colorClasses);
        
        var domainArray = [];
        
        for (var i=0; i<data.length; i++){
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        }
            
        var clusters = ss.ckmeans(domainArray, 5);
        
        domainArray = clusters.map(function(d){
            return d3.min(d);
        });
        
        domainArray.shift();
        
        colorScale.domain(domainArray);
        
        return colorScale;
    };
    
    function choropleth(props, colorScale){
        var val = parseFloat(props[expressed]);
        
        if (typeof val == 'number' && !isNaN(val)){
            return colorScale(val);
        } else {
            return "#CCC";
        }
    };
    
    function createDropdown(csvData){
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
               
                changeAttribute(this.value, csvData)
            });
        
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");
        
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){
                return d 
            })
            .text(function(d){
                return d
            });
    };
    
    function changeAttribute(attribute, csvData){
        expressed = attribute;
        
        var colorScale = createColorScale(csvData);
        
        var provinces = d3.selectAll(".provinceMap")
            .transition()
            .duration(1000)
            .style("fill", function(d){
                return choropleth(d.properties, colorScale)
            });
        
    };
    
    function highlight(props){
        var selected = d3.selectAll("." + props.NAME)
            .style("stroke", "#FED976")
            .style("stroke-width", "2");
    };
    
    function dehighlight(props){
        var selected = d3.selectAll("." + props.NAME)
            .style("stroke", function(){
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function(){
                return getStyle(this, "stroke-width")
            });
        
        function getStyle(element, styleName){
            var styleText = d3.select(element)
                .select("desc")
                .text();
            
            var styleObject = JSON.parse(styleText);
            
            return styleObject[styleName];
        };
        
        d3.select(".infoLabel")
            .remove()
    };
    
})();