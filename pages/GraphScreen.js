import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Dimensions, ScrollView, Button } from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import Papa from 'papaparse';

const screenWidth = Dimensions.get('window').width;

const getHealthRecommendation = (pm25Level) => {
  if (pm25Level > 250) {
    return {
      level: 'Hazardous',
      color: '#7E0023',
      icon: '⚠️',
      advice: 'Avoid outdoor activities. Wear N95 mask if going outside.'
    };
  } else if (pm25Level > 150) {
    return {
      level: 'Very Unhealthy',
      color: '#8F3F97',
      icon: '😷',
      advice: 'Minimize outdoor activities. Keep windows closed.'
    };
  } else if (pm25Level > 100) {
    return {
      level: 'Unhealthy',
      color: '#FF0000',
      icon: '⚡',
      advice: 'Sensitive groups should limit outdoor exposure.'
    };
  } else if (pm25Level > 50) {
    return {
      level: 'Moderate',
      color: '#FFA500',
      icon: '⚠️',
      advice: 'Acceptable air quality for most individuals.'
    };
  } else {
    return {
      level: 'Good',
      color: '#00E400',
      icon: '✅',
      advice: 'Air quality is satisfactory, ideal for outdoor activities.'
    };
  }
};

const GraphScreen = ({ route }) => {
  const { siteId, startDate, endDate } = route.params;
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState([]);
  const [hourlyData, setHourlyData] = useState([]); // New state for hourly data
  const [delhiData, setDelhiData] = useState(null);
  const [viewMode, setViewMode] = useState('daily'); // Add this line
  const [selectedGraph, setSelectedGraph] = useState("pm2.5cnc"); // Add this line

  const fetchDelhiData = async () => {
    try {
      const delhiSiteId = 'site_117'; // ITO, Delhi station
      const API_URL = `http://atmos.urbansciences.in/adp/v4/getDeviceDataParam/imei/${delhiSiteId}/params/pm2.5cnc,pm10cnc/startdate/${startDate}/enddate/${endDate}/ts/mm/avg/15/api/63h3AckbgtY?gaps=1&gap_value=NaN`;
      const response = await fetch(API_URL);
      const csvData = await response.text();
      const parsedData = Papa.parse(csvData, { header: true, skipEmptyLines: true });

      // Process Delhi data with maximum values
      const groupedData = parsedData.data.reduce((acc, curr) => {
        if (curr["pm2.5cnc"] === "NaN" || curr["pm10cnc"] === "NaN") return acc;
        
        const date = curr.dt_time.split(' ')[0];
        const pm25 = parseFloat(curr["pm2.5cnc"]);
        const pm10 = parseFloat(curr["pm10cnc"]);
        
        if (!acc[date] || pm25 > acc[date].pm25) {
          acc[date] = { pm25, pm10 };
        }
        return acc;
      }, {});

      const processedDelhiData = Object.entries(groupedData).map(([date, values]) => ({
        date,
        pm25: values.pm25,
        pm10: values.pm10
      }));

      setDelhiData(processedDelhiData);
    } catch (error) {
      console.error('Error fetching Delhi data:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const API_URL = `http://atmos.urbansciences.in/adp/v4/getDeviceDataParam/imei/${siteId}/params/pm2.5cnc,pm10cnc/startdate/${startDate}/enddate/${endDate}/ts/mm/avg/15/api/63h3AckbgtY?gaps=1&gap_value=NaN`;
        console.log("Fetching data from:", API_URL);
        const response = await fetch(API_URL);
        const csvData = await response.text();
        const parsedData = Papa.parse(csvData, { header: true, skipEmptyLines: true });
        
        console.log("Total data points:", parsedData.data.length);

        // Process hourly data including previous day
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // Get last 24 hours
        console.log("Filtering data from:", twentyFourHoursAgo, "to:", now);

        // Sort data by datetime first
        const sortedData = parsedData.data
          .filter(item => item["pm2.5cnc"] !== "NaN" && item["pm10cnc"] !== "NaN")
          .map(item => ({
            ...item,
            datetime: new Date(item.dt_time.replace(' ', 'T'))
          }))
          .sort((a, b) => b.datetime - a.datetime);

        // Get last 12 data points for each hour
        const hourlyMap = new Map();
        sortedData.forEach(item => {
          const hour = item.datetime.getHours();
          if (!hourlyMap.has(hour)) {
            hourlyMap.set(hour, {
              hour,
              pm25Values: [],
              pm10Values: [],
              lastUpdate: item.datetime
            });
          }
          const hourData = hourlyMap.get(hour);
          if (hourData.pm25Values.length < 4) { // Take up to 4 readings per hour (15-min intervals)
            hourData.pm25Values.push(parseFloat(item["pm2.5cnc"]));
            hourData.pm10Values.push(parseFloat(item["pm10cnc"]));
          }
        });

        // Convert to array and calculate averages
        const processedHourlyData = Array.from(hourlyMap.values())
          .map(({ hour, pm25Values, pm10Values, lastUpdate }) => ({
            hour,
            pm25: pm25Values.reduce((a, b) => a + b, 0) / pm25Values.length,
            pm10: pm10Values.reduce((a, b) => a + b, 0) / pm10Values.length,
            time: lastUpdate
          }))
          .sort((a, b) => a.hour - b.hour);

        console.log("Processed hourly data:", processedHourlyData);
        setHourlyData(processedHourlyData);

        // Group data by date and calculate averages
        const groupedData = parsedData.data.reduce((acc, curr) => {
          if (curr["pm2.5cnc"] === "NaN" || curr["pm10cnc"] === "NaN") return acc;
          
          const date = curr.dt_time.split(' ')[0];
          const pm25 = parseFloat(curr["pm2.5cnc"]);
          const pm10 = parseFloat(curr["pm10cnc"]);
          
          if (!acc[date]) {
            acc[date] = {
              pm25: [pm25],
              pm10: [pm10],
              timestamp: curr.dt_time,
              count: 1
            };
          } else {
            acc[date].pm25.push(pm25);
            acc[date].pm10.push(pm10);
            acc[date].count++;
          }
          return acc;
        }, {});

        // Calculate daily averages
        const processedData = Object.entries(groupedData).map(([date, values]) => ({
          date,
          pm25: values.pm25.reduce((a, b) => a + b) / values.count,
          pm10: values.pm10.reduce((a, b) => a + b) / values.count,
          timestamp: values.timestamp
        }));

        setDailyData(processedData);
        await fetchDelhiData();
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [siteId, startDate, endDate]);

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  const latestPm25 = dailyData[dailyData.length - 1]?.pm25 || 0;
  const healthRec = getHealthRecommendation(latestPm25);

  const chartData = {
    labels: dailyData.map(item => item.date.split('-')[2]), // Show only day
    datasets: [
      {
        data: dailyData.map(item => item.pm25),
        color: (opacity = 1) => `rgba(0, 0, 255, ${opacity})`,
        strokeWidth: 2,
        label: 'PM2.5'
      },
      {
        data: dailyData.map(item => item.pm10),
        color: (opacity = 1) => `rgba(0, 255, 0, ${opacity})`,
        strokeWidth: 2,
        label: 'PM10'
      }
    ],
    legend: ['PM2.5', 'PM10']
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: "#ffa726"
    }
  };

  const renderComparison = () => {
    if (!delhiData || !dailyData) return null;

    const comparisonData = {
      labels: dailyData.map(item => item.date.split('-')[2]),
      datasets: [
        {
          data: dailyData.map(item => item.pm25),
          color: () => '#FF6B6B',
          strokeWidth: 2,
          label: 'Your Location'
        },
        {
          data: delhiData.map(item => item.pm25),
          color: () => '#4ECDC4',
          strokeWidth: 2,
          label: 'Delhi'
        }
      ],
      legend: ['Your Location', 'Delhi']
    };

    const difference = (
      dailyData.reduce((acc, curr) => acc + curr.pm25, 0) / dailyData.length -
      delhiData.reduce((acc, curr) => acc + curr.pm25, 0) / delhiData.length
    ).toFixed(1);

    return (
      <View style={styles.comparisonContainer}>
        <Text style={styles.chartTitle}>Comparison with Delhi</Text>
        <Text style={styles.comparisonText}>
          Your location's air quality is{' '}
          <Text style={{ color: difference > 0 ? '#FF6B6B' : '#4ECDC4', fontWeight: 'bold' }}>
            {Math.abs(difference)} µg/m³ {difference > 0 ? 'worse' : 'better'}
          </Text>{' '}
          than Delhi's average
        </Text>
        
        <LineChart
          data={comparisonData}
          width={screenWidth - 32}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: {
              r: "6",
              strokeWidth: "2"
            }
          }}
          style={styles.chart}
          bezier
        />
      </View>
    );
  };

  const renderHourlyChart = () => {
    console.log("Rendering hourly chart with data:", hourlyData);
    
    if (!hourlyData.length) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>No hourly data available</Text>
        </View>
      );
    }

    const formatHour = (hour) => {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}${ampm}`;
    };

    const chartData = {
      labels: hourlyData.map(item => formatHour(item.hour)),
      datasets: [
        {
          data: hourlyData.map(item => 
            selectedGraph === "pm2.5cnc" ? Math.round(item.pm25 * 10) / 10 : Math.round(item.pm10 * 10) / 10
          ),
        }
      ],
    };

    const dataPoints = hourlyData.length;
    const chartWidth = Math.max(screenWidth, dataPoints * 60);
    
    const interval = Math.max(1, Math.floor(dataPoints / 8));
    const labels = hourlyData.map((item, index) => 
      index % interval === 0 ? `${String(item.hour).padStart(2, '0')}:00` : ""
    );

    // const chartData = {
    //   labels: labels,
    //   datasets: [{ 
    //     data: hourlyData.map(item => 
    //       selectedGraph === "pm2.5cnc" ? item.pm25 : item.pm10
    //     )
    //   }],
    // };

    const chartConfig = {
      backgroundGradientFrom: "#f5f5f5",
      backgroundGradientTo: "#ffffff",
      decimalPlaces: 1,
      color: () => "black",
      labelColor: () => "black",
      barPercentage: 0.6,
      fillShadowGradient: "blue",
      fillShadowGradientOpacity: 1,
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Last 12 Hours Air Quality Data</Text>
        
        <View style={styles.buttonContainer}>
          <Button
            title="PM2.5"
            onPress={() => setSelectedGraph("pm2.5cnc")}
            color={selectedGraph === "pm2.5cnc" ? "blue" : "gray"}
          />
          <Button
            title="PM10"
            onPress={() => setSelectedGraph("pm10cnc")}
            color={selectedGraph === "pm10cnc" ? "green" : "gray"}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <BarChart
            data={chartData}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            showValuesOnTopOfBars
          />
        </ScrollView>
        
        {/* Keep existing time analysis section */}
        <View style={styles.timeAnalysis}>
          <Text style={styles.analysisTitle}>Time-based Analysis</Text>
          <Text style={styles.analysisText}>
            🌅 Morning (6-9 AM): {calculateAveragePM25('06:00', '09:00')} µg/m³{'\n'}
            🏢 Office Hours (9-5 PM): {calculateAveragePM25('09:00', '17:00')} µg/m³{'\n'}
            🌙 Evening (5-10 PM): {calculateAveragePM25('17:00', '22:00')} µg/m³
          </Text>
        </View>
      </View>
    );
  };

  const calculateAveragePM25 = (startTime, endTime) => {
    const filteredData = hourlyData.filter(item => {
      const itemTime = item.time.toISOString().split('T')[1].substring(0, 5);
      return itemTime >= startTime && itemTime <= endTime;
    });
    if (!filteredData.length) return 'N/A';
    const avg = filteredData.reduce((sum, item) => sum + item.pm25, 0) / filteredData.length;
    return avg.toFixed(1);
  };

  // Add view toggle buttons right after the health card
  const renderViewToggle = () => (
    <View style={styles.toggleContainer}>
      <Button
        title="Daily View"
        onPress={() => setViewMode('daily')}
        color={viewMode === 'daily' ? '#4CAF50' : '#888'}
      />
      <Button
        title="Hourly View"
        onPress={() => setViewMode('hourly')}
        color={viewMode === 'hourly' ? '#4CAF50' : '#888'}
      />
    </View>
  );

  // Modify the return statement to use the view toggle
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Air Quality Analysis</Text>
        <Text style={styles.subtitle}>Location: {siteId}</Text>
      </View>

      <View style={[styles.healthCard, { backgroundColor: healthRec.color + '20' }]}>
        <Text style={styles.healthTitle}>
          {healthRec.icon} Current Air Quality: {healthRec.level}
        </Text>
        <Text style={styles.healthValue}>PM2.5: {latestPm25.toFixed(1)} µg/m³</Text>
        <Text style={styles.healthAdvice}>{healthRec.advice}</Text>
      </View>

      {renderViewToggle()}
      
      {viewMode === 'hourly' ? renderHourlyChart() : (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>7-Day PM2.5 & PM10 Trends (Average)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <BarChart
              data={chartData}
              width={Math.max(screenWidth - 32, dailyData.length * 100)}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16
                },
                propsForBackgroundLines: {
                  strokeDasharray: ''
                }
              }}
              style={styles.chart}
              showValuesOnTopOfBars
            />
          </ScrollView>
        </View>
      )}

      {renderComparison()}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Did you know?</Text>
        <Text style={styles.infoText}>
          Delhi is often used as a reference point for air quality in India as it frequently experiences some of the highest pollution levels among major cities.
        </Text>
      </View>

      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Daily Summary</Text>
        {dailyData.map((day, index) => (
          <View key={index} style={styles.summaryCard}>
            <Text style={styles.summaryDate}>{day.date}</Text>
            <View style={styles.summaryValues}>
              <Text style={styles.summaryText}>PM2.5: {day.pm25.toFixed(1)} µg/m³</Text>
              <Text style={styles.summaryText}>PM10: {day.pm10.toFixed(1)} µg/m³</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4
  },
  healthCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2
  },
  healthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8
  },
  healthValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 8
  },
  healthAdvice: {
    fontSize: 16,
    color: '#444'
  },
  chartContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333'
  },
  chart: {
    borderRadius: 12
  },
  comparisonContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2
  },
  summaryContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333'
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  summaryDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#444'
  },
  summaryValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8
  },
  summaryText: {
    fontSize: 14,
    color: '#666'
  },
  comparisonText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center'
  },
  infoCard: {
    backgroundColor: '#FFF9C4',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333'
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  peakHourText: {
    fontSize: 14,
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 12
  },
  timeAnalysis: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333'
  },
  analysisText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 24
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    elevation: 2
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  }
});

export default GraphScreen;
