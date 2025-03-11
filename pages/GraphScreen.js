import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Dimensions, ScrollView } from 'react-native';
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
        const response = await fetch(API_URL);
        const csvData = await response.text();
        const parsedData = Papa.parse(csvData, { header: true, skipEmptyLines: true });
        
        // Group data by date and find maximum values
        const groupedData = parsedData.data.reduce((acc, curr) => {
          if (curr["pm2.5cnc"] === "NaN" || curr["pm10cnc"] === "NaN") return acc;
          
          const date = curr.dt_time.split(' ')[0];
          const pm25 = parseFloat(curr["pm2.5cnc"]);
          const pm10 = parseFloat(curr["pm10cnc"]);
          
          if (!acc[date]) {
            acc[date] = {
              pm25: pm25,
              pm10: pm10,
              timestamp: curr.dt_time
            };
          } else {
            // Update if current value is higher
            if (pm25 > acc[date].pm25) {
              acc[date].pm25 = pm25;
              acc[date].timestamp = curr.dt_time;
            }
            if (pm10 > acc[date].pm10) {
              acc[date].pm10 = pm10;
            }
          }
          return acc;
        }, {});

        // Transform to array with maximum values
        const processedData = Object.entries(groupedData).map(([date, values]) => ({
          date,
          pm25: values.pm25,
          pm10: values.pm10,
          timestamp: values.timestamp
        }));

        // Process hourly data for current date with maximum values
        const currentDate = new Date().toISOString().split('T')[0];
        const todaysData = parsedData.data.filter(item => 
          item.dt_time.startsWith(currentDate) && 
          item["pm2.5cnc"] !== "NaN" && 
          item["pm10cnc"] !== "NaN"
        );

        // Group hourly data and find maximum values
        const hourlyGrouped = todaysData.reduce((acc, curr) => {
          const hour = curr.dt_time.split(' ')[1].substring(0, 2);
          const pm25 = parseFloat(curr["pm2.5cnc"]);
          const pm10 = parseFloat(curr["pm10cnc"]);
          
          if (!acc[hour]) {
            acc[hour] = { pm25, pm10, time: curr.dt_time.split(' ')[1] };
          } else if (pm25 > acc[hour].pm25) {
            acc[hour].pm25 = pm25;
            acc[hour].pm10 = pm10;
            acc[hour].time = curr.dt_time.split(' ')[1];
          }
          return acc;
        }, {});

        const processedHourlyData = Object.values(hourlyGrouped);

        setHourlyData(processedHourlyData);
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
    if (!hourlyData.length) return null;

    const hourlyChartData = {
      labels: hourlyData.map(item => item.time),
      datasets: [
        {
          data: hourlyData.map(item => item.pm25),
          color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`,
          strokeWidth: 2,
          label: 'PM2.5'
        }
      ],
      legend: ['PM2.5']
    };

    // Find peak hours
    const peakHour = hourlyData.reduce((max, item) => 
      item.pm25 > max.pm25 ? item : max
    , hourlyData[0]);

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Today's Hourly PM2.5 Levels</Text>
        <Text style={styles.peakHourText}>
          Peak pollution at {peakHour.time} ({peakHour.pm25.toFixed(1)} µg/m³)
        </Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <BarChart
            data={hourlyChartData}
            width={Math.max(screenWidth - 32, hourlyData.length * 50)}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
              propsForBackgroundLines: {
                strokeDasharray: ''
              }
            }}
            style={styles.chart}
            showValuesOnTopOfBars
          />
        </ScrollView>

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
    const filteredData = hourlyData.filter(item => 
      item.time >= startTime && item.time <= endTime
    );
    if (!filteredData.length) return 'N/A';
    const avg = filteredData.reduce((sum, item) => sum + item.pm25, 0) / filteredData.length;
    return avg.toFixed(1);
  };

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

      {renderHourlyChart()}

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>7-Day PM2.5 & PM10 Trends</Text>
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
  }
});

export default GraphScreen;
